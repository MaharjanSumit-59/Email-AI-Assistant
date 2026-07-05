import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function AuthSuccess() {

    const [searchParams] = useSearchParams();

    const navigate = useNavigate();

    const { login } = useAuth();

    useEffect(() => {

        const authenticate = async () => {

            const token = searchParams.get("token");

            if (!token) {

                navigate("/");

                return;

            }

            try {

                await login(token);

                navigate("/dashboard");

            } catch (error) {

                console.error(error);

                navigate("/");

            }

        };

        authenticate();

    }, []);

    return (

        <div className="min-h-screen flex items-center justify-center">

            <h2 className="text-xl font-semibold">
                Logging you in...
            </h2>

        </div>

    );
}