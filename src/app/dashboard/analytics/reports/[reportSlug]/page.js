import ReportDetailPageClient from '../ReportDetailPageClient';

export default function AnalyticsReportDetailPage({ params }) {
  const { reportSlug } = params;
  return <ReportDetailPageClient reportSlug={reportSlug} />;
}
