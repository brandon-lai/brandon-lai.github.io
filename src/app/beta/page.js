import Assemble from "./Assemble";
import "./assemble.css";

export const metadata = {
  title: "Brandon Lai — under construction",
  description: "Brandon Lai's site, assembled block by block by a small crew as you scroll.",
};

/** /beta: the bento page, built in front of you as you scroll. */
export default function BetaPage() {
  return <Assemble />;
}
