import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
// import styles from "./styles.module.css";

type CardItem = {
  title: string;
  link: string;
  description: JSX.Element;
  buttonName: string;
  buttonType:
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning"
    | "danger"
    | "link";
};

const CardList: CardItem[] = [
  {
    title: "🏁 Getting Started",
    link: "/category/getting-started",
    description: (
      <>
        Come check out the fastest way to get started with this template repo!
      </>
    ),
    buttonName: "Create new docs!",
    buttonType: "success",
  },
  {
    title: "💭 Repo Layout",
    link: "/getting-started/understanding-repo-layout",
    description: (
      <>
        See how this repo is laid out to understand what each file and folder is
        responsible for.
      </>
    ),
    buttonName: "Go to repo layout",
    buttonType: "secondary",
  },
  {
    title: "👨‍💻 Documentation style guide",
    link: "/getting-started/style-guide",
    description: (
      <>
        Find our standard documentation style guide to follow when applying to
        your docs repo.
      </>
    ),
    buttonName: "Go to reference",
    buttonType: "info",
  },
];

function Card({ title, link, description, buttonName, buttonType }: CardItem) {
  return (
    <div className={clsx("col", "col--4", "margin-top--md")}>
      <div className="card-demo">
        <div className="card">
          <div className="card__header">
            <h3>{title}</h3>
          </div>
          <div className="card__body">
            <p>{description}</p>
          </div>
          <div className="card__footer">
            <Link
              className={clsx(
                "button",
                "button--" + buttonType,
                "button--block",
              )}
              to={link}>
              {buttonName}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageCards(): JSX.Element {
  return (
    <section className={clsx("margin-top--lg", "margin-bottom--lg")}>
      <div className="container">
        <h1>Quick Links</h1>
        <hr />
        <div className="row">
          {CardList.map((props, idx) => (
            <Card key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
