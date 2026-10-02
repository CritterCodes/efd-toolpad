import { FaceliftRoot, LoadingPage } from '@/components/facelift';

/**
 * Shown while a dashboard route's data is on its way. Next renders this inside the dashboard layout, so
 * the sidebar, the app bar and the page's shape all stay put — which is the point. Before this file
 * existed the content area blanked and a `<CircularProgress />` floated in the middle of nothing.
 */
export default function DashboardLoading() {
  return (
    <FaceliftRoot>
      <LoadingPage label="Loading this page" />
    </FaceliftRoot>
  );
}
