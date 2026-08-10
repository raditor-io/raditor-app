"use client";

/**
 * Repository select with a trailing "Add GitHub Account" item (Vercel-style):
 * choosing it opens the connect popup instead of selecting a value, and the
 * list refreshes when the popup completes.
 */
import { useRef } from "react";

import {
  openGithubConnectPopup,
  useGithubConnectedRefresh,
} from "@/components/github/connect-github-button";
import { INPUT_CLASSES } from "@/components/shared/form-styles";

const ADD_ACCOUNT_VALUE = "__add_github_account__";

export interface RepoOption {
  value: string;
  label: string;
}

export interface RepoSelectProps {
  name: string;
  options: RepoOption[];
  /** Label of the empty first option (e.g. "Choose later"). */
  placeholder: string;
  /** Path to return to after connecting a new GitHub account. */
  returnTo: string;
  required?: boolean;
}

export function RepoSelect({
  name,
  options,
  placeholder,
  returnTo,
  required,
}: RepoSelectProps) {
  const ref = useRef<HTMLSelectElement>(null);
  const previousValue = useRef("");
  useGithubConnectedRefresh();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === ADD_ACCOUNT_VALUE) {
      event.target.value = previousValue.current;
      openGithubConnectPopup(returnTo);
      return;
    }
    previousValue.current = event.target.value;
  }

  return (
    <select
      ref={ref}
      name={name}
      defaultValue=""
      required={required}
      onChange={handleChange}
      className={INPUT_CLASSES}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      <option value={ADD_ACCOUNT_VALUE}>+ Add GitHub Account</option>
    </select>
  );
}
