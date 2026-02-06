import { Badge } from '@/components/ui/badge';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { DollarSign, CreditCard, Star, User } from 'lucide-react';

interface StaffMemberWithPermissions {
  id: string;
  user_id: string;
  full_name: string | null;
  job_title: string | null;
  staff_role: string | null;
  responsibilities: string[] | null;
  is_primary_contact: boolean | null;
  can_approve_pricing: boolean | null;
  can_collect_deposits: boolean | null;
}

interface RoleResponsibilitiesProps {
  staffMembers: StaffMemberWithPermissions[];
}

export function RoleResponsibilities({ staffMembers }: RoleResponsibilitiesProps) {
  // Filter staff with responsibilities or permissions set
  const staffWithRoles = staffMembers.filter(
    s => s.responsibilities?.length || s.is_primary_contact || s.can_approve_pricing || s.can_collect_deposits
  );

  if (staffWithRoles.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Role Responsibilities
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffWithRoles.map((staff) => (
          <ChromeSurface key={staff.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{staff.full_name || 'Unknown'}</h3>
                <p className="text-sm text-muted-foreground">{staff.job_title || staff.staff_role || 'Staff'}</p>
              </div>
              {staff.is_primary_contact && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>

            {/* Responsibilities */}
            {staff.responsibilities && staff.responsibilities.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Responsibilities:</p>
                <ul className="text-sm space-y-1">
                  {staff.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Permission Badges */}
            <div className="flex flex-wrap gap-2">
              {staff.can_approve_pricing && (
                <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-600">
                  <DollarSign className="h-3 w-3" />
                  Can Approve Pricing
                </Badge>
              )}
              {staff.can_collect_deposits && (
                <Badge variant="outline" className="text-xs gap-1 border-blue-500/30 text-blue-600">
                  <CreditCard className="h-3 w-3" />
                  Can Collect Deposits
                </Badge>
              )}
            </div>
          </ChromeSurface>
        ))}
      </div>
    </div>
  );
}
