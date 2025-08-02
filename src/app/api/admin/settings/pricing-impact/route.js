import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth';
import { connectToDatabase } from '@/lib/database';

/**
 * POST /api/admin/settings/pricing-impact
 * Preview the impact of pricing changes before applying them
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pricing } = body;

    if (!pricing) {
      return NextResponse.json({ error: 'Pricing data required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get current settings for comparison
    const currentSettings = await db.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!currentSettings) {
      return NextResponse.json({ error: 'Current settings not found' }, { status: 404 });
    }

    // Get all repair tasks
    const repairTasks = await db.collection('repairTasks').find({}).toArray();

    const analysis = {
      totalTasks: repairTasks.length,
      priceChanges: [],
      categoryAnalysis: {},
      summary: {
        currentAverage: 0,
        newAverage: 0,
        averageChange: 0,
        percentChange: 0,
        tasksWithIncrease: 0,
        tasksWithDecrease: 0,
        tasksUnchanged: 0
      }
    };

    let currentTotal = 0;
    let newTotal = 0;

    for (const task of repairTasks) {
      const currentPrice = task.basePrice || 0;
      
      // Calculate new price with proposed settings
      const laborCost = task.laborHours * pricing.wage;
      const materialMarkup = task.materialCost * 1.5;
      const subtotal = laborCost + materialMarkup;
      
      const businessMultiplier = pricing.administrativeFee + 
                               pricing.businessFee + 
                               pricing.consumablesFee + 1;
      
      const newPrice = Math.round(subtotal * businessMultiplier * 100) / 100;
      const change = newPrice - currentPrice;
      const percentChange = currentPrice > 0 ? (change / currentPrice * 100) : 0;

      // Track changes
      analysis.priceChanges.push({
        sku: task.sku,
        title: task.title,
        category: task.category,
        currentPrice: currentPrice,
        newPrice: newPrice,
        change: change,
        percentChange: percentChange
      });

      // Category analysis
      if (!analysis.categoryAnalysis[task.category]) {
        analysis.categoryAnalysis[task.category] = {
          count: 0,
          currentAverage: 0,
          newAverage: 0,
          averageChange: 0
        };
      }

      analysis.categoryAnalysis[task.category].count++;
      currentTotal += currentPrice;
      newTotal += newPrice;

      // Summary counts
      if (change > 0.01) {
        analysis.summary.tasksWithIncrease++;
      } else if (change < -0.01) {
        analysis.summary.tasksWithDecrease++;
      } else {
        analysis.summary.tasksUnchanged++;
      }
    }

    // Calculate averages
    analysis.summary.currentAverage = currentTotal / repairTasks.length;
    analysis.summary.newAverage = newTotal / repairTasks.length;
    analysis.summary.averageChange = analysis.summary.newAverage - analysis.summary.currentAverage;
    analysis.summary.percentChange = analysis.summary.currentAverage > 0 ? 
      (analysis.summary.averageChange / analysis.summary.currentAverage * 100) : 0;

    // Calculate category averages
    Object.keys(analysis.categoryAnalysis).forEach(category => {
      const categoryTasks = analysis.priceChanges.filter(t => t.category === category);
      const currentSum = categoryTasks.reduce((sum, t) => sum + t.currentPrice, 0);
      const newSum = categoryTasks.reduce((sum, t) => sum + t.newPrice, 0);
      
      analysis.categoryAnalysis[category].currentAverage = currentSum / categoryTasks.length;
      analysis.categoryAnalysis[category].newAverage = newSum / categoryTasks.length;
      analysis.categoryAnalysis[category].averageChange = 
        analysis.categoryAnalysis[category].newAverage - analysis.categoryAnalysis[category].currentAverage;
    });

    // Add pricing comparison
    analysis.pricingComparison = {
      current: currentSettings.pricing,
      proposed: pricing,
      changes: {
        wage: pricing.wage - currentSettings.pricing.wage,
        administrativeFee: pricing.administrativeFee - currentSettings.pricing.administrativeFee,
        businessFee: pricing.businessFee - currentSettings.pricing.businessFee,
        consumablesFee: pricing.consumablesFee - currentSettings.pricing.consumablesFee
      }
    };

    return NextResponse.json({
      success: true,
      analysis: analysis,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Pricing impact analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
