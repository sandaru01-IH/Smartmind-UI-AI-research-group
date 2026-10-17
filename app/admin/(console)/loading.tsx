import { AdminSkeleton } from '@/components/admin/admin-skeleton';

/** Shown the moment an admin link is clicked, until its page has its data. */
export default function Loading() {
  return <AdminSkeleton />;
}
