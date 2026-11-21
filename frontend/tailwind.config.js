module.exports = {
  content: {
    relative: true,
    files: ["./*.html", "./js/**/*.js", "../backend/templates/*.html"],
  },
  theme: {
    extend: {
      colors: {
        'pink-light': '#FFE4E9',
        'pink-medium': '#FFB3C1',
        'pink-dark': '#FF8FA3',
      }
    }
  }
}