/**
 * Charts for Career Path Predictor
 */

/**
 * Initialize the market trends chart
 * @param {string} canvasId - ID of the canvas element
 * @param {object} trendData - Market trend data from the backend
 */
function initMarketTrendsChart(canvasId, trendData) {
    const ctx = document.getElementById(canvasId);

    if (!ctx || !trendData || !trendData.careers) {
        console.error('Missing chart element or data');
        return;
    }

    // Extract data for chart
    const labels = trendData.careers.map(career => career.name);
    const growthData = trendData.careers.map(career => career.growth);
    const demandData = trendData.careers.map(career => career.demand);

    // Create the chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Growth Rate (%)',
                    data: growthData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Demand Level (1-10)',
                    data: demandData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label.includes('Growth')) {
                                    label += context.parsed.y + '%';
                                } else {
                                    label += context.parsed.y + '/10';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Career Paths'
                    }
                }
            }
        }
    });
}

/**
 * Initialize a skills radar chart
 * @param {string} canvasId - ID of the canvas element
 * @param {object} skillsData - Skills data for the chart
 */
function initSkillsRadarChart(canvasId, skillsData) {
    const ctx = document.getElementById(canvasId);

    if (!ctx || !skillsData) {
        console.error('Missing chart element or data');
        return;
    }

    // Create the chart
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: skillsData.labels,
            datasets: [
                {
                    label: 'Your Skills',
                    data: skillsData.userSkills,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    pointBackgroundColor: 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(54, 162, 235)'
                },
                {
                    label: 'Required Skills',
                    data: skillsData.requiredSkills,
                    fill: true,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgb(255, 99, 132)',
                    pointBackgroundColor: 'rgb(255, 99, 132)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(255, 99, 132)'
                }
            ]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            }
        }
    });
}
