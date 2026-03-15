import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffPerformanceTab from "@/components/StaffPerformanceTab";
import RolePermissionsTab from "@/components/admin/users/RolePermissionsTab";
import SecurityActivityTab from "@/components/admin/users/SecurityActivityTab";
import StaffGovernanceTab from "@/components/admin/users/StaffGovernanceTab";

const AdminUserControl = ({ users, setUsers }) => {
  const [activeTab, setActiveTab] = useState("governance");
  const [createDialogSeed, setCreateDialogSeed] = useState(0);
  const [rolesRefreshToken, setRolesRefreshToken] = useState(0);

  const hasLockedNonAdminUser = users.some(
    (user) => user.accountLocked && user.role?.toUpperCase() !== "ADMIN",
  );

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#0F172A]/10 mb-8 pb-3 gap-4">
          <TabsList className="bg-transparent w-auto justify-start h-auto p-0 gap-8 rounded-none mb-0">
            <TabsTrigger
              value="governance"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#7C3AED] rounded-none px-0 pb-3 -mb-[14px] font-black text-[#0F172A]/40 data-[state=active]:text-[#0F172A] shadow-none hover:bg-transparent tracking-tight"
            >
              Staff Governance
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#7C3AED] rounded-none px-0 pb-3 -mb-[14px] font-black text-[#0F172A]/40 data-[state=active]:text-[#0F172A] shadow-none hover:bg-transparent"
            >
              Security & Activity
              {hasLockedNonAdminUser && (
                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px]">!</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#7C3AED] rounded-none px-0 pb-3 -mb-[14px] font-black text-[#0F172A]/40 data-[state=active]:text-[#0F172A] shadow-none hover:bg-transparent"
            >
              Role Permissions
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#007A5E] rounded-none px-0 pb-3 -mb-[14px] font-black text-[#0F172A]/40 data-[state=active]:text-[#0F172A] shadow-none hover:bg-transparent"
            >
              Staff Performance
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center">
            <Button
              onClick={() => {
                setActiveTab("governance");
                setCreateDialogSeed((seed) => seed + 1);
              }}
              className="rounded-2xl bg-[#7C3AED] py-5 px-6 text-white font-black text-sm shadow-glow-amethyst hover:scale-105 transition-all"
            >
              Onboard New Staff
            </Button>
          </div>
        </div>

        <TabsContent value="governance" className="mt-0">
          <StaffGovernanceTab
            users={users}
            setUsers={setUsers}
            openCreateSignal={createDialogSeed}
            rolesRefreshToken={rolesRefreshToken}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <SecurityActivityTab users={users} setUsers={setUsers} />
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <RolePermissionsTab onRolesChanged={() => setRolesRefreshToken((token) => token + 1)} />
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <StaffPerformanceTab users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUserControl;
