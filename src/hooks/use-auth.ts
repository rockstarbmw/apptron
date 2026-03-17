import { useContext, createContext } from "react";

// Simple auth context - wallet based auth is handled in Admin/SuperAdmin pages directly
interface AuthContextType {
  isAuthenticated: boolean;
  user: null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useUser() {
  return { user: null, isLoading: false };
}
