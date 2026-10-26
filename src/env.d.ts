declare namespace App {
  interface Locals {
    user: import('./lib/auth').User | null;
    /** Admin pages: the username typed at the admin password prompt (shown in the admin top bar). */
    adminName?: string;
  }
}
