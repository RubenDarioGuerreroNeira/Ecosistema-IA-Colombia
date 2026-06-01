import { Injectable } from '@nestjs/common';

@Injectable()
export class ChartService {
  /**
   * Genera una URL de QuickChart basada en una configuración de Chart.js
   * Documentación: https://quickchart.io/documentation/
   */
  generateChartUrl(
    config: any,
    options: { width?: number; height?: number; format?: string } = {},
  ): string {
    const { width = 500, height = 300, format = 'png' } = options;
    const baseUrl = 'https://quickchart.io/chart';

    // Serializamos la configuración a JSON y la codificamos para la URL
    const chartParam = encodeURIComponent(JSON.stringify(config));

    return `${baseUrl}?w=${width}&h=${height}&f=${format}&c=${chartParam}`;
  }

  /**
   * Genera un gráfico de barras simple
   */
  generateBarChart(labels: string[], data: number[], title: string): string {
    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: title,
          fontSize: 20,
        },
        legend: {
          display: false,
        },
        plugins: {
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#444',
            font: {
              weight: 'bold',
            },
          },
        },
      },
    };
    return this.generateChartUrl(config);
  }

  /**
   * Genera un gráfico de torta/donas
   */
  generatePieChart(labels: string[], data: number[], title: string): string {
    const config = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: title,
          fontSize: 20,
        },
        plugins: {
          datalabels: {
            formatter: (value, ctx) => {
              let sum = 0;
              let dataArr = ctx.chart.data.datasets[0].data;
              dataArr.map((data) => {
                sum += data;
              });
              let percentage = ((value * 100) / sum).toFixed(1) + '%';
              return percentage;
            },
            color: '#fff',
          },
        },
      },
    };
    return this.generateChartUrl(config);
  }

  /**
   * Genera un gráfico de líneas para series temporales
   */
  generateLineChart(labels: string[], data: number[], title: string): string {
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: title,
            data: data,
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: title,
          fontSize: 20,
        },
      },
    };
    return this.generateChartUrl(config);
  }
}
