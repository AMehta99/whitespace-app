import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to projects page - auth middleware will handle unauthenticated users
  redirect("/projects");
}
