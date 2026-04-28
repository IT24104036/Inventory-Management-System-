import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { clearSession } from "@/lib/session";

const LogoutButton = ({ className }) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const handleLogout = () => {
        clearSession();
        toast({
            title: "Logged out successfully",
            description: "Redirecting to home page...",
            duration: 2000,
        });
        navigate("/");
    };
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button className={className}>
                    <LogOut size={16}/>
                    Log Out Session
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#2C2C2E] border border-[#444] shadow-[0_0_30px_rgba(0,0,0,0.5)] text-white rounded-2xl p-6 sm:p-8 max-w-[440px]">
                <AlertDialogHeader className="mb-1">
                    <AlertDialogTitle className="text-[30px] font-semibold text-center font-sans tracking-tight mb-4">Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#EAEAEA] text-center font-medium text-[16px] leading-relaxed">
                        Are you sure you want to end your current<br/>session?<br/>
                        You will need to log in again to access the portal.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-4 mt-8 w-full">
                    <AlertDialogCancel className="flex-1 bg-[#333] border border-[#555] text-white hover:bg-[#3A3A3C] hover:text-white rounded-xl py-3 m-0 font-medium text-[15px] transition-colors h-[50px]">
                        Stay Logged In
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="flex-1 bg-[#ED583E] hover:bg-[#D44830] text-white rounded-xl py-3 m-0 font-medium text-[15px] transition-colors h-[50px] shadow-none border-none">
                        Yes, Log Out
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default LogoutButton;
