import { getAll, getById, create, update, remove } from "../services/api.service.js";
import { getCurrentUser } from "./auth.js";

   import { debounce } from "../utils/helpers.js";

   let allItems = [];   // lo que vino de la API, sin tocar

   function apply() {
     const term = $("#filter").value.trim().toLowerCase();
     const sort = $("#sort").value;

     let view = allItems.filter((m) => (m.title ?? m.name).toLowerCase().includes(term));

     view.sort((a, b) => {
       if (sort === "rating") return b.vote_average - a.vote_average;
       return (b.release_date ?? "").localeCompare(a.release_date ?? "");
     });

     grid.replaceChildren(...view.map((m) => createMovieCard(m)));
   }

   $("#sort").addEventListener("change", apply);
   $("#filter").addEventListener("input", debounce(apply, 250));