import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { useAuth } from "../contexts/AuthContext";

export function Root() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // localStorage 체크 완료를 기다림
    const timer = setTimeout(() => {
      setIsChecking(false);
      if (!userRole) {
        navigate('/login');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [userRole, navigate]);

  if (isChecking || !userRole) {
    return null;
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}