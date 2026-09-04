import { redirect } from "next/navigation";

// La raiz va al Dashboard: es la pantalla de inicio y es a donde lleva el logo
// del menu.
export default function Home() {
  redirect("/dashboard");
}
