/**
 * Bundle Analyzer — Utilities for analyzing and reporting bundle metrics
 * Run with: ANALYZE=1 npm run build
 */

class BundleAnalyzer {
  /**
   * Recommended bundle size limits (gzipped)
   */
  static LIMITS = {
    'vendor.js': 120,      // KB - 3rd party dependencies
    'chunk-analytics.js': 30,
    'chunk-admin.js': 50,
    'chunk-premium.js': 40,
    'chunk-auth.js': 35,
    'chunk-calculator.js': 25,
    'chunk-stack.js': 30,
    'chunk-utils.js': 20,
    'chunk-platform.js': 25,
    'main.js': 80,         // Core app logic
  };

  /**
   * Analyze bundle against limits
   * @param {Object} bundleStats - Stats from rollup visualizer
   * @returns {Object} Analysis report
   */
  static analyze(bundleStats) {
    const report = {
      total: 0,
      violations: [],
      warnings: [],
      healthy: [],
    };

    for (const [fileName, size] of Object.entries(bundleStats)) {
      const limit = this.LIMITS[fileName];
      report.total += size;

      if (!limit) {
        report.warnings.push({
          file: fileName,
          size,
          message: `No limit set for ${fileName}`,
        });
        continue;
      }

      if (size > limit) {
        report.violations.push({
          file: fileName,
          size,
          limit,
          overage: size - limit,
          percent: ((size / limit - 1) * 100).toFixed(1),
        });
      } else {
        report.healthy.push({
          file: fileName,
          size,
          limit,
          margin: (limit - size).toFixed(1),
        });
      }
    }

    return report;
  }

  /**
   * Format analysis report for console
   * @param {Object} report - Analysis report from analyze()
   */
  static printReport(report) {
    console.group('Bundle Analysis Report');

    console.log(`\nTotal Bundle Size: ${report.total.toFixed(1)}KB`);

    if (report.violations.length > 0) {
      console.group(`VIOLATIONS (${report.violations.length})`);
      console.table(report.violations);
      console.groupEnd();
    }

    if (report.warnings.length > 0) {
      console.group(`Warnings (${report.warnings.length})`);
      console.table(report.warnings);
      console.groupEnd();
    }

    if (report.healthy.length > 0) {
      console.group(`Healthy Chunks (${report.healthy.length})`);
      console.table(report.healthy);
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Get optimization recommendations
   * @param {Object} report - Analysis report from analyze()
   * @returns {string[]} List of recommendations
   */
  static getRecommendations(report) {
    const recommendations = [];

    for (const violation of report.violations) {
      if (violation.file === 'vendor.js') {
        recommendations.push(
          `Vendor bundle is ${violation.overage.toFixed(1)}KB over limit. Consider:\n` +
          '  1. Remove unused dependencies\n' +
          '  2. Split Firebase into separate chunk\n' +
          '  3. Tree-shake unused exports'
        );
      } else if (violation.file.includes('chunk-')) {
        const feature = violation.file.replace('chunk-', '').replace('.js', '');
        recommendations.push(
          `${feature} chunk is ${violation.overage.toFixed(1)}KB over limit. Consider:\n` +
          `  1. Split ${feature} into smaller modules\n` +
          `  2. Defer non-critical initialization\n` +
          `  3. Extract shared utilities`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All chunks are within recommended limits!');
    }

    return recommendations;
  }

  /**
   * Get import size estimation (useful before bundling)
   * @param {string} modulePath - Module to estimate
   * @returns {Object} Estimated size info
   */
  static estimateModuleSize(modulePath) {
    // This is a placeholder; actual implementation would use webpack-bundle-analyzer
    return {
      estimated: '~unknown',
      note: 'Run: npx webpack-bundle-analyzer dist/stats.json',
    };
  }
}

export default BundleAnalyzer;
