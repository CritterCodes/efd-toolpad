import { format } from "date-fns";
import { getDateRangeForTimeline } from "./timeline.js";

export function processVendorAnalyticsData(data, vendorName, timeline) {
  const salesData = data.analytics?.salesByProduct?.nodes || [];
  const orders = data.orders?.edges || [];

  // Filter orders containing vendor products (fallback for order count)
  const vendorOrders = orders.filter(order => 
    order.node.lineItems.edges.some(item => 
      item.node.product?.vendor === vendorName
    )
  );

  // Calculate metrics from analytics data
  const totalRevenue = salesData.reduce((sum, day) => sum + parseFloat(day.netSales || 0), 0);
  const totalOrders = salesData.reduce((sum, day) => sum + parseInt(day.orders || 0), 0);
  const totalQuantity = salesData.reduce((sum, day) => sum + parseInt(day.quantity || 0), 0);

  // Generate time series data from analytics
  const timeSeriesData = generateAnalyticsTimeSeriesData(salesData, timeline);

  console.log(`📊 [SHOPIFY] Processed analytics for ${vendorName}:`, {
    totalRevenue,
    totalOrders,
    totalQuantity,
    dataPoints: salesData.length
  });

  return {
    stats: {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalQuantity,
      timeline: timeline
    },
    timeSeries: timeSeriesData.revenue,
    orderTimeSeries: timeSeriesData.orders
  };
}

export function processAnalyticsData(data, vendorName, timeline) {
  const orders = data.orders?.edges || [];
  const products = data.products?.edges || [];

  // Filter orders containing vendor products
  const vendorOrders = orders.filter(order => 
    order.node.lineItems.edges.some(item => 
      item.node.product?.vendor === vendorName
    )
  );

  // Calculate metrics
  const totalOrders = vendorOrders.length;
  
  // Calculate total products sold (sum of quantities)
  const totalProductsSold = vendorOrders.reduce((sum, order) => {
    const vendorLineItems = order.node.lineItems.edges.filter(item => 
      item.node.product?.vendor === vendorName
    );
    const orderProductCount = vendorLineItems.reduce((itemSum, item) => 
      itemSum + parseInt(item.node.quantity || 0), 0
    );
    return sum + orderProductCount;
  }, 0);
  
  const totalRevenue = vendorOrders.reduce((sum, order) => {
    const vendorLineItems = order.node.lineItems.edges.filter(item => 
      item.node.product?.vendor === vendorName
    );
    const vendorOrderTotal = vendorLineItems.reduce((itemSum, item) => 
      itemSum + parseFloat(item.node.originalTotalSet.shopMoney.amount), 0
    );
    return sum + vendorOrderTotal;
  }, 0);

  // Generate time series data
  const timeSeriesData = generateTimeSeriesData(vendorOrders, timeline, vendorName);

  console.log(`📊 [SHOPIFY] Processed analytics for ${vendorName}:`, {
    totalOrders,
    totalProductsSold,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  });

  return {
    summary: {
      totalOrders,
      totalProductsSold,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      productCount: products.length,
      timeline: timeline
    },
    timeSeries: {
      orders: timeSeriesData.orders,
      productsSold: timeSeriesData.productsSold,
      revenue: timeSeriesData.revenue,
      views: timeSeriesData.views // This would need additional tracking
    }
  };
}

export function generateAnalyticsTimeSeriesData(salesData, timeline) {
  const revenueData = salesData.map(day => ({
    date: day.date,
    value: parseFloat(day.netSales || 0),
    label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const orderData = salesData.map(day => ({
    date: day.date,
    value: parseInt(day.orders || 0),
    label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  return {
    revenue: revenueData,
    orders: orderData
  };
}

export function generateTimeSeriesData(orders, timeline, vendorName) {
  const { since, until } = getDateRangeForTimeline(timeline);
  const startDate = new Date(since);
  const endDate = new Date(until);
  
  // Determine interval based on timeline
  let interval = 'day';
  if (timeline.includes('month') || timeline.includes('quarter') || timeline.includes('year')) {
    interval = timeline.includes('year') ? 'month' : 'week';
  }

  const dataPoints = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = format(current, 'yyyy-MM-dd');
    
    // Count orders for this date
    const dayOrders = orders.filter(order => {
      const orderDate = format(new Date(order.node.createdAt), 'yyyy-MM-dd');
      return orderDate === dateStr;
    });

    // Calculate products sold for this vendor on this day
    const dayProductsSold = dayOrders.reduce((sum, order) => {
      const vendorLineItems = order.node.lineItems.edges.filter(item => 
        item.node.product?.vendor === vendorName
      );
      const orderProductCount = vendorLineItems.reduce((itemSum, item) => 
        itemSum + parseInt(item.node.quantity || 0), 0
      );
      return sum + orderProductCount;
    }, 0);

    // Calculate vendor revenue for this day
    const dayRevenue = dayOrders.reduce((sum, order) => {
      const vendorLineItems = order.node.lineItems.edges.filter(item => 
        item.node.product?.vendor === vendorName
      );
      const vendorOrderTotal = vendorLineItems.reduce((itemSum, item) => 
        itemSum + parseFloat(item.node.originalTotalSet.shopMoney.amount), 0
      );
      return sum + vendorOrderTotal;
    }, 0);

    dataPoints.push({
      date: dateStr,
      orders: dayOrders.length,
      productsSold: dayProductsSold,
      revenue: dayRevenue,
      views: Math.floor(Math.random() * 50) + 10 // Mock views until tracking is implemented
    });

    // Increment based on interval
    if (interval === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (interval === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return {
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
  };
}
