"use client";
import { useRouter } from "next/navigation";
import { routes } from "../../constants/routes";
import { adminApi } from "../../lib/adminApi";
import {
  Actions,
  AdminTag,
  Bar,
  BrandAccent,
  LogoutButton,
  NewListingLink,
  WordmarkLink,
} from "./styled";

export function AdminHeader() {
  const router = useRouter();

  async function logout() {
    try {
      await adminApi.logout();
    } finally {
      router.replace(routes.adminLogin);
      router.refresh();
    }
  }

  return (
    <Bar>
      <WordmarkLink href={routes.admin}>
        Mo<BrandAccent>Gadget</BrandAccent>
        <AdminTag>admin</AdminTag>
      </WordmarkLink>
      <Actions>
        <NewListingLink href={routes.adminNew}>+ New listing</NewListingLink>
        <LogoutButton type="button" onClick={logout}>
          Log out
        </LogoutButton>
      </Actions>
    </Bar>
  );
}
