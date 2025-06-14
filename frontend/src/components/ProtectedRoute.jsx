import React, { useEffect, useState } from "react";
/**
 * 
 * Used to check if the user is logged in when navigating through different pages
 */
const ProtectedRoute = ({ children }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:8000/user_info/", {
          credentials: "include",
        });

        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          window.location.href =
            "https://movienight.auth.us-east-1.amazoncognito.com/login?client_id=6sncmdem84i1dlrh1ope133442&response_type=code&scope=email+openid&redirect_uri=http://localhost:8000/Login";
        }
      } catch (err) {
        console.error("Auth check failed", err);
        window.location.href =
          "https://movienight.auth.us-east-1.amazoncognito.com/login?client_id=6sncmdem84i1dlrh1ope133442&response_type=code&scope=email+openid&redirect_uri=http://localhost:8000/Login";
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (checkingAuth) return <div>Loading...</div>;
  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
