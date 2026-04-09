const fs = require('fs');
const path = require('path');

function processShopifyAnalytics() {
    const mainFile = 'src/lib/shopifyAnalyticsService.js';
    let code = fs.readFileSync(mainFile, 'utf8');
    
    // Split out Utils
    const datesMatch = code.match(/(\/\*\*[\s\S]*?export function getDateRangeForTimeline.*?}[\s\S]*?})/)[0];
    const utilsDir = 'src/lib/analytics';
    fs.mkdirSync(utilsDir, { recursive: true });
    
    // Extract constants
    const consts = `export const TIMELINE_OPTIONS = [\n  { value: 'last_7_days', label: 'Last 7 days' },\n  { value: 'last_30_days', label: 'Last 30 days' },\n  { value: 'last_3_months', label: 'Last 3 months' },\n  { value: 'last_12_months', label: 'Last 12 months' },\n  { value: 'week_to_date', label: 'Week to date' },\n  { value: 'month_to_date', label: 'Month to date' },\n  { value: 'quarter_to_date', label: 'Quarter to date' },\n  { value: 'year_to_date', label: 'Year to date' },\n  { value: 'last_week', label: 'Last week' },\n  { value: 'last_month', label: 'Last month' },\n  { value: 'last_quarter', label: 'Last quarter' },\n  { value: 'last_year', label: 'Last year' }\n];`;
    code = code.replace(consts, '');

    fs.writeFileSync(path.join(utilsDir, 'analyticsUtils.js'), `import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';\n\n${consts}\n\n${datesMatch}`);
    
    code = code.replace(datesMatch, '');
    
    // Extract formatters/helpers
    const generatorsMatch = code.match(/generateAnalyticsTimeSeriesData[\s\S]*?return \{[\s\S]*?orders: ordersMap[\s\S]*?\};/);
    if(generatorsMatch) {
       // Too complex. Let's just blindly chop the file into Class extensions or a Processor function
    }
    
    const imports = `import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';\n`;
    code = code.replace(imports, `import { getDateRangeForTimeline, TIMELINE_OPTIONS } from './analytics/analyticsUtils';\n`);
    fs.writeFileSync(mainFile, code);
}

processShopifyAnalytics();
