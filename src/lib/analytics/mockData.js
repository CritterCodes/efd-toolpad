import { format } from "date-fns";
import { getDateRangeForTimeline } from "./timeline.js";

export function getMockAnalyticsData(timeline, vendorName = null) {
  const { since, until } = getDateRangeForTimeline(timeline);
  const dataPoints = [];
  const current = new Date(since);
  const endDate = new Date(until);

  // Create vendor-specific seed for consistent but different data per vendor
  const vendorSeed = vendorName ? vendorName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
  const vendorMultiplier = (vendorSeed % 5) + 1; // Creates 1-5 multiplier based on vendor name

  while (current <= endDate) {
    const orders = Math.floor((Math.random() * 3 + 1) * vendorMultiplier);
    const productsSold = Math.floor((Math.random() * 8 + 2) * vendorMultiplier); // More products than orders
    const revenue = Math.floor((Math.random() * 200 + 50) * vendorMultiplier);
    
    dataPoints.push({
      date: format(current, 'yyyy-MM-dd'),
      orders: orders,
      productsSold: productsSold,
      revenue: revenue,
      views: Math.floor(Math.random() * 50) + 10
    });
    current.setDate(current.getDate() + 1);
  }

  // Calculate totals based on vendor multiplier
  const baseOrders = 8;
  const baseProductsSold = 25;
  const baseRevenue = 2000;
  
  return {
    summary: {
      totalOrders: baseOrders * vendorMultiplier,
      totalProductsSold: baseProductsSold * vendorMultiplier,
      totalRevenue: baseRevenue * vendorMultiplier,
      averageOrderValue: Math.floor((baseRevenue * vendorMultiplier) / (baseOrders * vendorMultiplier)),
      productCount: Math.floor(5 * vendorMultiplier),
      timeline: timeline
    },
    timeSeries: {
      orders: dataPoints,
      productsSold: dataPoints.map(point => ({
        date: point.date,
        value: point.productsSold,
        label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })),
      revenue: dataPoints.map(point => ({
        date: point.date,
        value: point.revenue,
        label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })),
      views: dataPoints
    }
  };
}
