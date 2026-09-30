import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/** Controle de acesso compartilhado entre servidor (auth.ts) e cliente (auth-client.ts). */
export const ac = createAccessControl(defaultStatements);

/** Coordenação: papel administrativo, com todas as permissões do plugin admin. */
export const coordenacao = ac.newRole({ ...adminAc.statements });

/** Catequista: sem permissões administrativas. */
export const catequista = ac.newRole({ user: [], session: [] });

export const roles = { coordenacao, catequista };
