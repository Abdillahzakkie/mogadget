"use client";
import { routes } from "../../constants/routes";
import { Bar, BrandAccent, Nav, NavLink, WordmarkLink, Wrap } from "./styled";

// Public site chrome: wordmark + primary nav.
export function Navbar() {
  return (
    <Bar>
      <Wrap>
        <WordmarkLink href={routes.home}>
          Mo<BrandAccent>Gadget</BrandAccent>
        </WordmarkLink>
        <Nav>
          <NavLink href={routes.catalog}>Shop</NavLink>
          <NavLink href={routes.contact}>Visit us</NavLink>
        </Nav>
      </Wrap>
    </Bar>
  );
}
