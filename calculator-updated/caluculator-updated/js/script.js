document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart
    let growthChart;
    
    // Hide results section initially
    document.getElementById('results').style.display = 'none';
    
    // Form submission handler
    document.getElementById('stpForm').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateSTP();
    });
    
    // FV function equivalent to Excel's FV function
    function futureValue(rate, nper, pmt, pv, type = 0) {
        if (rate === 0) {
            return pv + pmt * nper;
        }
        
        const pvif = Math.pow(1 + rate, nper);
        let fv = 0;
        
        if (type === 1) {
            // Payments at beginning of period
            fv = (pv * pvif) + (pmt * (1 + rate) * (pvif - 1) / rate);
        } else {
            // Payments at end of period (default)
            fv = (pv * pvif) + (pmt * (pvif - 1) / rate);
        }
        
        return -fv; // Excel FV returns negative value for positive PV
    }
    
    function calculateSTP() {
        // Get input values
        const lumpsumAmount = parseFloat(document.getElementById('lumpsumAmount').value);
        const stpAmount = parseFloat(document.getElementById('stpAmount').value);
        const debtReturn = parseFloat(document.getElementById('debtReturn').value) / 100;
        const equityReturn = parseFloat(document.getElementById('equityReturn').value) / 100;
        const stpDuration = parseInt(document.getElementById('stpDuration').value);
        
        // Validate inputs
        if (isNaN(lumpsumAmount) || isNaN(stpAmount) || isNaN(debtReturn) || 
            isNaN(equityReturn) || isNaN(stpDuration)) {
            alert('Please fill all fields with valid numbers');
            return;
        }
        
        // Calculate STP (Excel calculation logic)
        let debtBalance = lumpsumAmount;
        let equityValue = 0;
        const yearlySTPAmount = stpAmount * 12; // Convert monthly to yearly
        
        const yearlyData = [];
        const chartLabels = [];
        
        for (let year = 1; year <= stpDuration; year++) {
            // Calculate debt fund using FV function (Excel logic)
            // FV(rate, nper, pmt, pv, type) = FV(debtReturn, 1, 0, -(debtBalance - yearlySTPAmount), 0)
            const newDebtBalance = futureValue(debtReturn, 1, 0, -(debtBalance - yearlySTPAmount), 0);
            const debtGrowth = (debtBalance - yearlySTPAmount) * debtReturn;
            
            // Calculate equity fund using FV function (Excel logic)
            // For year 1: FV(equityReturn, 1, 0, -(equityValue + yearlySTPAmount), 0)
            // For subsequent years: FV(equityReturn, 1, 0, -(previousEquity + yearlySTPAmount), 1)
            let newEquityValue;
            if (year === 1) {
                newEquityValue = futureValue(equityReturn, 1, 0, -(equityValue + yearlySTPAmount), 0);
            } else {
                newEquityValue = futureValue(equityReturn, 1, 0, -(equityValue + yearlySTPAmount), 1);
            }
            const equityGrowth = (equityValue + yearlySTPAmount) * equityReturn;
            
            // Record data for this year
            const totalValue = newDebtBalance + newEquityValue;
            
            yearlyData.push({
                year,
                lumpsumAmount: debtBalance,
                stpOut: yearlySTPAmount,
                debtReturn: debtReturn * 100,
                debtGrowth: debtGrowth,
                debtBalance: newDebtBalance,
                stpIn: yearlySTPAmount,
                equityReturn: equityReturn * 100,
                equityGrowth: equityGrowth,
                equityValue: newEquityValue,
                totalValue: totalValue
            });
            
            // Update balances for next iteration
            debtBalance = newDebtBalance;
            equityValue = newEquityValue;
            
            // For chart labels
            chartLabels.push(`Year ${year}`);
        }
        
        // Update results
        const totalTransferred = yearlyData.reduce((sum, yearData) => sum + yearData.stpIn, 0);
        document.getElementById('totalTransferred').textContent = `₹${formatCurrency(totalTransferred)}`;
        document.getElementById('finalValue').textContent = `₹${formatCurrency(yearlyData[yearlyData.length - 1].totalValue)}`;
        document.getElementById('remainingDebt').textContent = `₹${formatCurrency(yearlyData[yearlyData.length - 1].debtBalance)}`;
        document.getElementById('totalGrowth').textContent = `₹${formatCurrency(yearlyData[yearlyData.length - 1].totalValue - lumpsumAmount)}`;
        
        // Update chart - use the exact values from yearlyData
        updateChart(chartLabels, 
            yearlyData.map(data => data.debtBalance),
            yearlyData.map(data => data.equityValue),
            yearlyData.map(data => data.totalValue)
        );
        
        // Update table
        updateTable(yearlyData);
        
        // Show results section after calculation
        document.getElementById('results').style.display = 'block';
        
        // Scroll to results section
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }
    
    function formatCurrency(amount) {
        if (amount < 0) {
            return `-₹${Math.abs(amount).toLocaleString('en-IN', {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0
            })}`;
        }
        return `₹${amount.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        })}`;
    }
    
    function formatCurrencyWithDecimal(amount) {
        if (amount < 0) {
            return `-₹${Math.abs(amount).toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            })}`;
        }
        return `₹${amount.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        })}`;
    }
    
    function updateChart(labels, debtData, equityData, totalData) {
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (growthChart) {
            growthChart.destroy();
        }
        
        // Create new chart
        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Debt Fund Balance',
                        data: debtData,
                        borderColor: '#2E5BFF',
                        backgroundColor: 'rgba(46, 91, 255, 0.1)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Equity Fund Value',
                        data: equityData,
                        borderColor: '#00A86B',
                        backgroundColor: 'rgba(0, 168, 107, 0.1)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Total Value',
                        data: totalData,
                        borderColor: '#4A4E74',
                        backgroundColor: 'rgba(74, 78, 116, 0.1)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'STP Growth Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateTable(data) {
        const tableBody = document.querySelector('#monthlyTable tbody');
        tableBody.innerHTML = '';
        
        // Add all years to the table
        for (let i = 0; i < data.length; i++) {
            const yearData = data[i];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${yearData.year}</td>
                <td>${formatCurrency(yearData.lumpsumAmount)}</td>
                <td>${formatCurrency(yearData.stpOut)}</td>
                <td>${yearData.debtReturn.toFixed(0)}%</td>
                <td>${formatCurrency(yearData.debtGrowth)}</td>
                <td>${formatCurrency(yearData.debtBalance)}</td>
                <td>${formatCurrency(yearData.stpIn)}</td>
                <td>${yearData.equityReturn.toFixed(0)}%</td>
                <td>${formatCurrency(yearData.equityGrowth)}</td>
                <td>${formatCurrency(yearData.equityValue)}</td>
                <td>${formatCurrency(yearData.totalValue)}</td>
            `;
            
            tableBody.appendChild(row);
        }
    }
});