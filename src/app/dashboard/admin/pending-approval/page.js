import DashboardLayout, { 
  AdminPendingApproval
} from '@/components/dashboard/DashboardLayout';

export default function PendingApprovalPage() {
  return (
    <DashboardLayout>
      <AdminPendingApproval />
    </DashboardLayout>
  );
}
