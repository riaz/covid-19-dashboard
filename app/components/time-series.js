/**
 * Copyright 2020, Verizon Media.
 * Licensed under the Apache License, Version 2.0. See accompanying LICENSE file for terms.
 */
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { action, computed } from '@ember/object';
import numeral from 'numeral';

const METRICS = {
  'totalConfirmedCases': 'Confirmed',
  'totalDeaths': 'Fatal'
}

export default class TimeSeriesComponent extends Component {
  @service elide;
  @tracked records;
  @service intl;

  get chartOptions() {
    const { ymin, ymax } = this;

    return {
      chart: {
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      colors: ['#19c6f4', '#fed800', '#87d812'],
      grid: {
        padding: {
          left: 0,
          right: 0
        }
      },
      legend: {
        markers: {
          width: 8,
          height: 8
        },
        offsetX: 20
      },
      stroke: {
        curve: "smooth",
        width: 2
      },
      tooltip: {
        style: {
          fontSize: '12px'
        }
      },
      xaxis: {
        type: "datetime",
        labels: {
          style: {
            fontSize: '10px'
          },
          offsetY: -5
        },
        tooltip: {
          enabled: false
        }
      },
      yaxis: {
        labels: {
          formatter: (val) => numeral(val).format('0.0a'),
          style: {
            fontSize: '10px'
          },
          offsetX: 20,
          offsetY: -5
        },
        min: ymin,
        max: ymax,
        tickAmount: 3
      }
    };
  }

  @computed('records')
  get series() {
    if(this.loading || !this.records) return [];
    return this.records;
  }

  @action
  fetchData() {
    const { location } = this.args;
    if (location) {
      this.fetchRecords.perform(location);
    }
  }

  @(task(function* (location) {
    const records = yield this.elide.fetch.perform('healthRecords', {
      eq: { wikiId: location.attributes.wikiId },
      fields: {
        healthRecords: [
          'referenceDate',
          'totalConfirmedCases',
          'totalDeaths'
        ]
      }
    });

    this.records = this.convertToSeries(records);
  }).restartable())
  fetchRecords;

  convertToSeries(records) {
    const chartSeriesData = [];
    const data = records.data.map(r => r.attributes);

    Object.keys(METRICS).forEach(metric => {
      const seriesObj = this.getSeriesForMetric(data, metric);
      chartSeriesData.push({
        name: METRICS[metric],
        data: seriesObj
      });
    });

    return chartSeriesData;
  }

  getSeriesForMetric(data, metric) {
    let min = 0, max = 0;
    const results = []
    data.forEach(row => {
      const seriesObj = {};
      seriesObj.x = new Date(row.referenceDate).getTime();
      const cases = row[metric];
      seriesObj.y = cases;
      results.push(seriesObj);

      if(cases < min) min = cases;
      if(cases > max) max = cases;
    });

    this.ymin = min;
    this.ymax = max;

    return results;
  }
}
