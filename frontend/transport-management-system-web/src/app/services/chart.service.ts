import { Injectable } from '@angular/core';
import Chart from 'chart.js/auto';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private charts = new Map<string, Chart>();

  createPieChart(canvasId: string, config: {
    labels: string[];
    values: number[];
    colors: string[];
    counts: number[];
    title?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Get canvas element
          const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
          
          if (!canvas) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            resolve(false);
            return;
          }

          // Check if canvas context can be acquired
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get 2D context from canvas');
            resolve(false);
            return;
          }

          // Destroy existing chart if any
          this.destroyChart(canvasId);

          // Create new chart
          const chart = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: config.labels,
              datasets: [{
                data: config.values,
                backgroundColor: config.colors,
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverOffset: 15
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false // We'll use custom legend
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const count = config.counts[context.dataIndex] || 0;
                      return `${label}: ${value.toFixed(1)}% (${count} trips)`;
                    }
                  }
                },
                title: {
                  display: !!config.title,
                  text: config.title,
                  font: {
                    size: 16,
                    weight: 'bold'
                  }
                }
              },
              animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
              }
            }
          });

          this.charts.set(canvasId, chart);
          
          // Update custom legend
          this.updateCustomLegend(canvasId, config);
          
          resolve(true);
        } catch (error) {
          console.error('Chart creation error:', error);
          resolve(false);
        }
      }, 100);
    });
  }

  private updateCustomLegend(canvasId: string, config: any): void {
    const legendContainer = document.getElementById('chartLegend');
    if (!legendContainer) return;

    let legendHtml = '';
    
    config.labels.forEach((label: string, index: number) => {
      const percentage = config.values[index];
      const count = config.counts[index];
      const color = config.colors[index];
      
      legendHtml += `
        <div class="legend-item" data-index="${index}">
          <span class="legend-color" style="background-color: ${color}"></span>
          <span class="legend-label">${label}</span>
          <span class="legend-percentage">${percentage.toFixed(1)}%</span>
          <span class="legend-count">(${count})</span>
        </div>
      `;
    });
    
    legendContainer.innerHTML = legendHtml;
  }

  destroyChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  destroyAllCharts(): void {
    this.charts.forEach((chart, canvasId) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  updateChart(canvasId: string, config: any): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.data.labels = config.labels;
      chart.data.datasets[0].data = config.values;
      chart.data.datasets[0].backgroundColor = config.colors;
      chart.update();
      this.updateCustomLegend(canvasId, config);
    }
  }
}