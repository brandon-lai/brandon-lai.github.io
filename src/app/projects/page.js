import ProjectsShelf from "./ProjectsShelf";
import "./projects.css";

export const metadata = {
  title: "Side Projects — Brandon Lai",
  description: "Interactive toys, watchmaking tools, generative art, and tiny games — every one live in the browser.",
};

export default function ProjectsPage() {
  return <ProjectsShelf />;
}
