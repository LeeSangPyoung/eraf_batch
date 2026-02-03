import i18next from "i18next";
import { initReactI18next } from "react-i18next";

//Import all translation files
import en from "./translations/en.json";
import kor from "./translations/kor.json";

const resources = {
    en: {
        translation: en,
    },
    kor: {
        translation: kor,
    },
}

i18next.use(initReactI18next)
.init({
  resources,
  lng:"en", //default language
});

export default i18next;