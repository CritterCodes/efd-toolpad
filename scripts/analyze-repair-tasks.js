const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Data Analysis Script - Phase 1
 * Analyzes existing repair tasks to understand patterns and prepare for migration
 */
class RepairTaskDataAnalyzer {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.analysisResults = {
      totalTasks: 0,
      skuPatterns: {},
      titlePatterns: {},
      tagPatterns: {},
      priceRanges: {},
      categories: {},
      errors: []
    };
  }

  async connect() {
    try {
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      const dbName = process.env.MONGO_DB_NAME || 'efd-database';
      this.db = this.mongoClient.db(dbName);
      console.log(`✅ Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log('📦 MongoDB connection closed');
    }
  }

  /**
   * Analyze existing repair tasks collection
   */
  async analyzeExistingTasks() {
    try {
      const collection = this.db.collection('repairTasks');
      const tasks = await collection.find({}).toArray();
      
      console.log(`🔍 Analyzing ${tasks.length} existing repair tasks...`);
      this.analysisResults.totalTasks = tasks.length;

      for (const task of tasks) {
        this.analyzeSKU(task);
        this.analyzeTitle(task);
        this.analyzeTags(task);
        this.analyzePrice(task);
        this.categorizeTask(task);
      }

      return this.analysisResults;
    } catch (error) {
      console.error('❌ Error analyzing tasks:', error);
      this.analysisResults.errors.push(error.message);
      return this.analysisResults;
    }
  }

  /**
   * Analyze SKU patterns to understand current structure
   */
  analyzeSKU(task) {
    const sku = task.sku || '';
    
    // Parse current SKU format: "repair-101-szdn-ss"
    const parts = sku.split('-');
    const pattern = parts.length > 0 ? parts.join('-').replace(/\d+/g, 'XXX') : 'unknown';
    
    if (!this.analysisResults.skuPatterns[pattern]) {
      this.analysisResults.skuPatterns[pattern] = {
        count: 0,
        examples: []
      };
    }
    
    this.analysisResults.skuPatterns[pattern].count++;
    if (this.analysisResults.skuPatterns[pattern].examples.length < 5) {
      this.analysisResults.skuPatterns[pattern].examples.push({
        sku: sku,
        title: task.title,
        tags: task.tags
      });
    }
  }

  /**
   * Analyze title patterns to identify categories
   */
  analyzeTitle(task) {
    const title = (task.title || '').toLowerCase();
    
    // Common repair task keywords
    const keywords = {
      sizing: ['size', 'sizing', 'resize'],
      prongs: ['prong', 'prongs', 'claw'],
      chain: ['chain', 'link'],
      stone: ['stone', 'gem', 'diamond', 'setting'],
      engraving: ['engrave', 'engraving', 'inscribe'],
      bracelet: ['bracelet', 'bangle'],
      watch: ['watch', 'battery', 'band'],
      misc: ['clean', 'polish', 'repair', 'fix']
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => title.includes(word))) {
        if (!this.analysisResults.titlePatterns[category]) {
          this.analysisResults.titlePatterns[category] = {
            count: 0,
            examples: []
          };
        }
        this.analysisResults.titlePatterns[category].count++;
        if (this.analysisResults.titlePatterns[category].examples.length < 3) {
          this.analysisResults.titlePatterns[category].examples.push(task.title);
        }
        break;
      }
    }
  }

  /**
   * Analyze tags to understand categorization
   */
  analyzeTags(task) {
    const tags = task.tags || [];
    
    tags.forEach(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      if (!this.analysisResults.tagPatterns[normalizedTag]) {
        this.analysisResults.tagPatterns[normalizedTag] = 0;
      }
      this.analysisResults.tagPatterns[normalizedTag]++;
    });
  }

  /**
   * Analyze price ranges by category
   */
  analyzePrice(task) {
    const price = task.price || 0;
    const category = this.inferCategory(task);
    
    if (!this.analysisResults.priceRanges[category]) {
      this.analysisResults.priceRanges[category] = {
        min: price,
        max: price,
        total: 0,
        count: 0,
        examples: []
      };
    }
    
    const range = this.analysisResults.priceRanges[category];
    range.min = Math.min(range.min, price);
    range.max = Math.max(range.max, price);
    range.total += price;
    range.count++;
    
    if (range.examples.length < 3) {
      range.examples.push({
        title: task.title,
        price: price,
        sku: task.sku
      });
    }
  }

  /**
   * Categorize tasks for migration planning
   */
  categorizeTask(task) {
    const category = this.inferCategory(task);
    
    if (!this.analysisResults.categories[category]) {
      this.analysisResults.categories[category] = {
        count: 0,
        examples: [],
        avgPrice: 0,
        suggestedShortCodePrefix: this.getCategoryCode(category)
      };
    }
    
    this.analysisResults.categories[category].count++;
    if (this.analysisResults.categories[category].examples.length < 5) {
      this.analysisResults.categories[category].examples.push({
        _id: task._id,
        sku: task.sku,
        title: task.title,
        price: task.price,
        tags: task.tags
      });
    }
  }

  /**
   * Infer category from task data
   */
  inferCategory(task) {
    const title = (task.title || '').toLowerCase();
    const tags = (task.tags || []).join(' ').toLowerCase();
    const sku = (task.sku || '').toLowerCase();
    const content = `${title} ${tags} ${sku}`;
    
    if (content.includes('size') || content.includes('sizing') || content.includes('resize')) return 'shank';
    if (content.includes('prong') || content.includes('claw')) return 'prongs';
    if (content.includes('stone') || content.includes('setting') || content.includes('gem')) return 'stone_setting';
    if (content.includes('engrave') || content.includes('inscribe')) return 'engraving';
    if (content.includes('chain') || content.includes('link')) return 'chains';
    if (content.includes('bracelet') || content.includes('bangle')) return 'bracelet';
    if (content.includes('watch') || content.includes('battery') || content.includes('band')) return 'watch';
    
    return 'misc';
  }

  /**
   * Get category code for shortCode generation
   */
  getCategoryCode(category) {
    const categoryMap = {
      'shank': '0',
      'prongs': '1', 
      'stone_setting': '2',
      'engraving': '3',
      'chains': '4',
      'bracelet': '5',
      'watch': '6',
      'misc': '7'
    };
    return categoryMap[category] || '7';
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport() {
    console.log('\n📊 REPAIR TASK DATA ANALYSIS REPORT');
    console.log('=====================================\n');
    
    console.log(`📈 Total Tasks Analyzed: ${this.analysisResults.totalTasks}\n`);
    
    // SKU Patterns
    console.log('🏷️  SKU PATTERNS:');
    Object.entries(this.analysisResults.skuPatterns).forEach(([pattern, data]) => {
      console.log(`   ${pattern}: ${data.count} tasks`);
      data.examples.slice(0, 2).forEach(ex => {
        console.log(`      Example: ${ex.sku} → "${ex.title}"`);
      });
    });
    
    // Categories
    console.log('\n📋 TASK CATEGORIES:');
    Object.entries(this.analysisResults.categories).forEach(([category, data]) => {
      const avgPrice = data.count > 0 ? (this.analysisResults.priceRanges[category]?.total / this.analysisResults.priceRanges[category]?.count || 0).toFixed(2) : 0;
      console.log(`   ${category.toUpperCase()}: ${data.count} tasks (Avg: $${avgPrice})`);
      console.log(`      ShortCode Prefix: ${data.suggestedShortCodePrefix}XXXX`);
      data.examples.slice(0, 2).forEach(ex => {
        console.log(`      Example: ${ex.sku} → "${ex.title}" ($${ex.price})`);
      });
    });
    
    // Price Ranges
    console.log('\n💰 PRICE ANALYSIS:');
    Object.entries(this.analysisResults.priceRanges).forEach(([category, range]) => {
      const avg = (range.total / range.count).toFixed(2);
      console.log(`   ${category.toUpperCase()}: $${range.min} - $${range.max} (Avg: $${avg})`);
    });
    
    // Common Tags
    console.log('\n🏷️  TOP TAGS:');
    const sortedTags = Object.entries(this.analysisResults.tagPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    sortedTags.forEach(([tag, count]) => {
      console.log(`   "${tag}": ${count} times`);
    });
    
    if (this.analysisResults.errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      this.analysisResults.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    console.log('\n✅ Analysis complete. Ready for migration planning!\n');
  }

  /**
   * Save analysis results to file for migration script
   */
  async saveAnalysisResults() {
    const fs = require('fs').promises;
    const filePath = './analysis-results.json';
    
    try {
      await fs.writeFile(filePath, JSON.stringify(this.analysisResults, null, 2));
      console.log(`💾 Analysis results saved to: ${filePath}`);
    } catch (error) {
      console.error('❌ Failed to save analysis results:', error);
    }
  }
}

// Run the analysis
async function runAnalysis() {
  const analyzer = new RepairTaskDataAnalyzer();
  
  try {
    await analyzer.connect();
    await analyzer.analyzeExistingTasks();
    analyzer.generateReport();
    await analyzer.saveAnalysisResults();
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await analyzer.disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  runAnalysis().catch(console.error);
}

module.exports = RepairTaskDataAnalyzer;
