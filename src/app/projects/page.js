import ProjectsShelf from "./ProjectsShelf";
import "./projects.css";

export const metadata = {
  title: "Side Projects — Brandon Lai",
  description: "Small things I made for the browser: watch tools, a tide pool, origami, sheep and a dogfight game.",
};

export default function ProjectsPage() {
  return <ProjectsShelf />;
}
