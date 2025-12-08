import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export const DashboardSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl">
    {/* Header */}
    <div className="mb-8">
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>

    {/* Main Card */}
    <Skeleton className="h-48 rounded-2xl mb-6" />

    {/* Progress */}
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  </div>
);

export const ServicesSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl">
    {/* Header */}
    <div className="mb-8">
      <Skeleton className="h-8 w-36 mb-2" />
      <Skeleton className="h-4 w-56" />
    </div>

    {/* Service Cards */}
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton className="h-48 rounded-2xl" />
        </motion.div>
      ))}
    </div>
  </div>
);

export const BookingsSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8 max-w-5xl">
    {/* Header */}
    <div className="mb-6 sm:mb-8 flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>

    {/* Booking Cards */}
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Skeleton className="h-32 rounded-2xl" />
        </motion.div>
      ))}
    </div>
  </div>
);

export const GarageSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>

    {/* Vehicle Cards */}
    <div className="grid gap-4 sm:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton className="h-40 rounded-2xl" />
        </motion.div>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-2xl">
    {/* Header */}
    <div className="mb-8">
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>

    {/* Avatar and Name */}
    <div className="flex items-center gap-4 mb-8">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>

    {/* Info Fields */}
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-3"
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-full max-w-48" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export const StoreSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8 max-w-6xl">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>

    {/* Product Grid */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Skeleton className="aspect-square rounded-2xl mb-2" />
          <Skeleton className="h-4 w-3/4 mb-1" />
          <Skeleton className="h-5 w-16" />
        </motion.div>
      ))}
    </div>
  </div>
);

export const JobTrackingSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8 max-w-5xl">
    {/* Header */}
    <div className="mb-6 sm:mb-8 flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-52" />
      </div>
    </div>

    {/* Progress Bar */}
    <Skeleton className="h-24 rounded-2xl mb-6" />

    {/* Stages */}
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-3"
        >
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </motion.div>
      ))}
    </div>
  </div>
);
