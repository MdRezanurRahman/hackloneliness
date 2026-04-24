import { redirect } from "next/navigation";

// Renamed to /echoes/new — posts are now Echoes (text, photo, video).
export default function LegacyNewPost() {
  redirect("/echoes/new");
}
