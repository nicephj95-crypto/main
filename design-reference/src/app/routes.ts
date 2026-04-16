import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { LoginPage } from "./pages/LoginPage";
import { DispatchPage } from "./pages/DispatchPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AddressBookPage } from "./pages/AddressBookPage";
import { GroupManagePage } from "./pages/GroupManagePage";
import { UserManagePage } from "./pages/UserManagePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: DispatchPage },
      { path: "history", Component: HistoryPage },
      { path: "addressbook", Component: AddressBookPage },
      { path: "groups", Component: GroupManagePage },
      { path: "users", Component: UserManagePage },
    ],
  },
]);