/**
 * Vercel Speed Insights Integration Helper
 * 
 * This file provides utilities and documentation for integrating Vercel Speed Insights
 * into this project. 
 * 
 * IMPORTANT NOTE: This is currently a backend API project. Vercel Speed Insights is 
 * designed for frontend applications to track browser performance metrics (Core Web Vitals).
 * The package has been installed and is ready to use if/when a frontend is added to this project.
 * 
 * USAGE INSTRUCTIONS:
 * 
 * If you add a frontend to this project, follow the appropriate integration method below:
 * 
 * 1. FOR NEXT.JS (v13.5+):
 *    Add to your root layout file (app/layout.tsx):
 *    
 *    import { SpeedInsights } from '@vercel/speed-insights/next';
 *    
 *    export default function RootLayout({ children }) {
 *      return (
 *        <html lang="en">
 *          <body>
 *            {children}
 *            <SpeedInsights />
 *          </body>
 *        </html>
 *      );
 *    }
 * 
 * 2. FOR REACT/SPA:
 *    Add to your root component:
 *    
 *    import { SpeedInsights } from '@vercel/speed-insights/react';
 *    
 *    export default function App() {
 *      return (
 *        <div>
 *          // Your app content
 *          <SpeedInsights />
 *        </div>
 *      );
 *    }
 * 
 * 3. FOR VUE:
 *    Add to your main template:
 *    
 *    <script setup lang="ts">
 *    import { SpeedInsights } from '@vercel/speed-insights/vue';
 *    </script>
 *    
 *    <template>
 *      <SpeedInsights />
 *    </template>
 * 
 * 4. FOR VANILLA HTML/STATIC SITES:
 *    Add this script to your HTML head:
 *    
 *    <script>
 *      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
 *    </script>
 *    <script defer src="/_vercel/speed-insights/script.js"></script>
 * 
 * ENABLING IN VERCEL DASHBOARD:
 * 
 * Before Speed Insights can collect data, you must enable it in your Vercel project:
 * 1. Go to your Vercel project dashboard
 * 2. Navigate to the Speed Insights tab in the sidebar
 * 3. Click the "Enable" button
 * 4. Deploy your project
 * 5. The /_vercel/speed-insights/* routes will be automatically provisioned
 * 
 * VIEWING METRICS:
 * 
 * Once enabled and deployed:
 * - Metrics will appear in the Speed Insights dashboard in your Vercel project
 * - Data collection begins immediately after users visit your site
 * - Comprehensive metrics will be available after several days of visitor activity
 * 
 * For more information, see: https://vercel.com/docs/speed-insights/quickstart
 */

/**
 * HTML snippet generator for adding Speed Insights to static HTML pages
 * @returns {string} HTML snippet to inject into <head> tag
 */
export function getSpeedInsightsSnippet() {
  return `
<script>
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
  `.trim();
}

/**
 * Middleware to inject Speed Insights into HTML responses (if serving HTML)
 * This is a placeholder for when/if this project serves HTML content.
 * 
 * Usage:
 * app.use(injectSpeedInsights);
 */
export function injectSpeedInsights(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only inject if response is HTML
    if (res.get('Content-Type')?.includes('text/html') && typeof data === 'string') {
      const snippet = getSpeedInsightsSnippet();
      // Inject before closing </head> tag
      data = data.replace('</head>', `${snippet}\n</head>`);
    }
    originalSend.call(this, data);
  };
  
  next();
}

export default {
  getSpeedInsightsSnippet,
  injectSpeedInsights
};
