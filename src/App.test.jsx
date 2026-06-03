import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, test, expect } from "vitest";
import MoviesPage from "./MoviesPage";

beforeEach(() => {
  document.cookie = "moviehub_search=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "moviehub_selected_movie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "moviehub_visits=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

afterEach(() => {
  cleanup();
});

describe("MovieHub", () => {
 test("renders title and movie table", () => {
  render(<MoviesPage />);

  expect(screen.getAllByText(/moviehub/i).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { level: 2, name: /^Movies$/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: /^Movie details$/i })).toBeInTheDocument();
});
  test("adds a new movie", async () => {
    const user = userEvent.setup();
    render(<MoviesPage />);

    await user.type(screen.getByLabelText(/title/i), "The Matrix");
    await user.type(screen.getByLabelText(/genre/i), "Sci-Fi");
    await user.type(screen.getByLabelText(/rating/i), "9");
    await user.type(screen.getByLabelText(/year/i), "1999");
    await user.selectOptions(screen.getByLabelText(/status/i), "Watched");
    await user.type(
      screen.getByLabelText(/description/i),
      "A hacker discovers the truth about reality."
    );

    await user.click(screen.getByRole("button", { name: /add movie/i }));

    expect(screen.getAllByText("The Matrix").length).toBeGreaterThan(0);
  });

  test("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    render(<MoviesPage />);

    await user.type(screen.getByLabelText(/title/i), "A");
    await user.type(screen.getByLabelText(/genre/i), "AB");
    await user.type(screen.getByLabelText(/rating/i), "11");
    await user.type(screen.getByLabelText(/year/i), "1500");
    await user.type(screen.getByLabelText(/description/i), "short");

    await user.click(screen.getByRole("button", { name: /add movie/i }));

    expect(screen.getByText(/title must have at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/genre must have at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/rating must be a number between 0 and 10/i)).toBeInTheDocument();
    expect(screen.getByText(/year must be between 1900/i)).toBeInTheDocument();
    expect(screen.getByText(/description must have at least 10 characters/i)).toBeInTheDocument();
  });

  test("edits a movie", async () => {
    const user = userEvent.setup();
    render(<MoviesPage />);

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Inception Updated");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getAllByText("Inception Updated").length).toBeGreaterThan(0);
  });

  test("deletes a movie", async () => {
    const user = userEvent.setup();
    render(<MoviesPage />);

    expect(screen.getByText("Titanic")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[1]);

    expect(screen.queryByText("Titanic")).not.toBeInTheDocument();
  });

  test("search filters movies", async () => {
  const user = userEvent.setup();
  render(<MoviesPage />);

  await user.type(screen.getByPlaceholderText(/search movie/i), "Titanic");

  expect(screen.getByText("Titanic")).toBeInTheDocument();
  
 });

   test("pagination goes to next page", async () => {
      const user = userEvent.setup();
      render(<MoviesPage />);
      const searchInput = screen.getByPlaceholderText(/search movie/i);
      await user.clear(searchInput);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("Joker")).toBeInTheDocument();
  });

});