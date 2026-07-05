import { useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getInbox } from "../../services/emailService";

export default function Dashboard() {

    useEffect(() => {

        async function fetchEmails() {

            try {
                const data = await getInbox();
                console.log(data);
            } catch (error) {
                console.error(error);
            }

        }

        fetchEmails();

    }, []);

    return (
        <DashboardLayout>
            <h1 className="text-3xl font-bold">
                Dashboard
            </h1>
        </DashboardLayout>
    );
}