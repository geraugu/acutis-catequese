import { describe, expect, it } from "vitest";
import type { DataCivil } from "@/modules/compartilhado/datas";
import {
  IDADE_MINIMA_PADRAO,
  ROTULO_SACRAMENTO,
  SACRAMENTOS,
  campoDoFormulario,
  criarFichaSchema,
  lerFichaDoFormulario,
} from "@/modules/catequizandos/domain/ficha";

const hoje = "2026-09-30" as DataCivil;
const schema = criarFichaSchema({ hoje });

const naoRecebido = { recebido: false };
function base(extra: Record<string, unknown> = {}) {
  return {
    nome: "Maria Silva",
    dataNascimento: "2000-01-15",
    telefone: "(11) 98765-4321",
    email: "",
    endereco: "",
    observacoes: "",
    sacramentos: { batismo: naoRecebido, eucaristia: naoRecebido, crisma: naoRecebido },
    ...extra,
  };
}

function erros(entrada: unknown, s = schema): Record<string, string> {
  const r = s.safeParse(entrada);
  if (r.success) return {};
  const mapa: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = campoDoFormulario(issue.path);
    mapa[campo] ??= issue.message;
  }
  return mapa;
}

describe("constantes", () => {
  it("expõe idade mínima, sacramentos e rótulos", () => {
    expect(IDADE_MINIMA_PADRAO).toBe(16);
    expect(SACRAMENTOS).toEqual(["batismo", "eucaristia", "crisma"]);
    expect(ROTULO_SACRAMENTO).toEqual({
      batismo: "Batismo",
      eucaristia: "Eucaristia",
      crisma: "Crisma",
    });
  });
});

describe("criarFichaSchema", () => {
  it("aceita ficha válida e normaliza", () => {
    const r = schema.parse(base({ nome: "  Maria Silva  ", email: "  Maria@X.com " }));
    expect(r.nome).toBe("Maria Silva");
    expect(r.telefone).toBe("11987654321");
    expect(r.email).toBe("maria@x.com");
    expect(r.endereco).toBeUndefined();
    expect(r.observacoes).toBeUndefined();
  });

  it("e-mail vazio vira undefined", () => {
    expect(schema.parse(base()).email).toBeUndefined();
    expect(schema.parse(base({ email: "   " })).email).toBeUndefined();
  });

  it("recusa obrigatórios com mensagens por campo", () => {
    const e = erros(base({ nome: " ", dataNascimento: "", telefone: "123", email: "x@" }));
    expect(e.nome).toBe("Informe o nome");
    expect(e.dataNascimento).toBe("Informe uma data válida");
    expect(e.telefone).toBe("Informe um telefone com DDD");
    expect(e.email).toBe("E-mail inválido");
  });

  it("recusa nascimento no futuro", () => {
    expect(erros(base({ dataNascimento: "2026-10-01" })).dataNascimento).toBe(
      "Informe uma data válida",
    );
  });

  it("recusa 15 anos e 364 dias e aceita 16 exatos", () => {
    expect(erros(base({ dataNascimento: "2010-10-01" })).dataNascimento).toBe(
      "A idade mínima é de 16 anos",
    );
    expect(schema.safeParse(base({ dataNascimento: "2010-09-30" })).success).toBe(true);
  });

  it("usa idade mínima customizada", () => {
    const s = criarFichaSchema({ hoje, idadeMinima: 18 });
    expect(erros(base({ dataNascimento: "2010-09-30" }), s).dataNascimento).toBe(
      "A idade mínima é de 18 anos",
    );
    expect(s.safeParse(base({ dataNascimento: "2008-09-30" })).success).toBe(true);
  });

  it("descarta data e paróquia de sacramento não recebido", () => {
    const r = schema.parse(
      base({
        sacramentos: {
          batismo: { recebido: false, data: "2099-01-01", paroquia: "São José" },
          eucaristia: { recebido: true, data: "2010-05-01", paroquia: "  Sé  " },
          crisma: { recebido: true, data: "", paroquia: "" },
        },
      }),
    );
    expect(r.sacramentos.batismo).toEqual({ recebido: false });
    expect(r.sacramentos.eucaristia).toEqual({
      recebido: true,
      data: "2010-05-01",
      paroquia: "Sé",
    });
    expect(r.sacramentos.crisma).toEqual({ recebido: true });
  });

  it("recusa data de sacramento futura ou anterior ao nascimento", () => {
    const e = erros(
      base({
        sacramentos: {
          batismo: { recebido: true, data: "1999-12-31" },
          eucaristia: { recebido: true, data: "2026-10-01" },
          crisma: { recebido: true, data: "2026-02-30" },
        },
      }),
    );
    expect(e.batismoData).toBe("Data do sacramento inválida");
    expect(e.eucaristiaData).toBe("Data do sacramento inválida");
    expect(e.crismaData).toBe("Data do sacramento inválida");
  });
});

describe("entradas não objeto e nome vazio", () => {
  it("safeParse de undefined e null falha sem lançar", () => {
    expect(schema.safeParse(undefined).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
    expect(schema.safeParse(base({ sacramentos: null })).success).toBe(false);
    expect(schema.safeParse(base({ sacramentos: { crisma: null } })).success).toBe(false);
  });

  it("nome vazio gera só uma issue", () => {
    const r = schema.safeParse(base({ nome: "  " }));
    expect(r.success).toBe(false);
    const nome = r.success ? [] : r.error.issues.filter((i) => i.path[0] === "nome");
    expect(nome.map((i) => i.message)).toEqual(["Informe o nome"]);
  });
});

describe("erros no mesmo envio", () => {
  it("nome vazio não impede o erro da data de crisma", () => {
    const r = schema.safeParse(
      base({
        nome: "",
        sacramentos: {
          batismo: naoRecebido,
          eucaristia: naoRecebido,
          crisma: { recebido: true, data: "2026-10-01" },
        },
      }),
    );
    const issues = r.success ? [] : r.error.issues;
    expect(issues.filter((i) => i.path[0] === "nome").map((i) => i.message)).toEqual([
      "Informe o nome",
    ]);
    expect(issues.some((i) => i.path.join(".") === "sacramentos.crisma.data")).toBe(true);
  });

  it("reporta telefone inválido e data de crisma futura juntos", () => {
    const e = erros(
      base({
        telefone: "123",
        sacramentos: {
          batismo: naoRecebido,
          eucaristia: naoRecebido,
          crisma: { recebido: true, data: "2026-10-01" },
        },
      }),
    );
    expect(e.telefone).toBe("Informe um telefone com DDD");
    expect(e.crismaData).toBe("Data do sacramento inválida");
  });
});

describe("lerFichaDoFormulario", () => {
  it("lê campos planos e checkboxes", () => {
    const f = new FormData();
    f.set("nome", "Ana");
    f.set("dataNascimento", "2000-01-01");
    f.set("telefone", "11987654321");
    f.set("batismoRecebido", "on");
    f.set("batismoData", "2000-03-01");
    f.set("batismoParoquia", "Matriz");
    f.set("crismaData", "2020-01-01");
    expect(lerFichaDoFormulario(f)).toEqual({
      nome: "Ana",
      dataNascimento: "2000-01-01",
      telefone: "11987654321",
      email: "",
      endereco: "",
      observacoes: "",
      sacramentos: {
        batismo: { recebido: true, data: "2000-03-01", paroquia: "Matriz" },
        eucaristia: { recebido: false, data: "", paroquia: "" },
        crisma: { recebido: false, data: "2020-01-01", paroquia: "" },
      },
    });
  });
});

describe("campoDoFormulario", () => {
  it("mapeia caminhos para nomes de campo", () => {
    expect(campoDoFormulario(["nome"])).toBe("nome");
    expect(campoDoFormulario(["sacramentos", "crisma", "data"])).toBe("crismaData");
  });
});
