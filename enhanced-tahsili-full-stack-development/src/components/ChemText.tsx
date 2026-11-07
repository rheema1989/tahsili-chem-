"use client";

import React from "react";
import { renderChemHtml, formatChemMarkup } from "@/lib/chem-utils";

interface ChemTextProps {
  text: string;
  className?: string;
  isEquation?: boolean;
}

export function ChemText({ text, className = "", isEquation = false }: ChemTextProps) {
  const html = isEquation ? formatChemMarkup(text) : renderChemHtml(text);
  return (
    <span
      className={className}
      dir={isEquation ? "ltr" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
