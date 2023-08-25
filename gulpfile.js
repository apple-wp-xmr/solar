let gulp = require('gulp'),
    sass = require('gulp-sass')(require('sass')),
    browserSync = require('browser-sync'),
    uglify = require('gulp-uglify-es').default,
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    del = require('del'),
    autoprefixer = require('gulp-autoprefixer'),
    sourcemaps = require('gulp-sourcemaps'),
    purgecss = require('gulp-purgecss');

gulp.task('clean', async function () {
    del.sync(['dist/**', '!dist/.git', '!dist/readme.md']);
});

gulp.task('scss', function () {
    return (
        gulp
            .src('app/scss/**/*.scss')
            .pipe(sourcemaps.init())
            .pipe(sass().on('error', sass.logError))
            .pipe(
                autoprefixer({
                    overrideBrowserslist: ['last 3 versions'],
                })
            )
            // .pipe(
            //     purgecss(
            //         { content: ['app/index.html'] }
            //     )
            // )

            .pipe(rename({ suffix: '.min' }))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('app/css'))

            .pipe(browserSync.reload({ stream: true }))
    );
});

gulp.task('css', function () {
    return (
        gulp
            //'node_modules/normalize.css/normalize.css',
            .src(['node_modules/sweetalert2/dist/sweetalert2.css', 'node_modules/plyr/dist/plyr.css', 'node_modules/aos/dist/aos.css'])
            .pipe(concat('_libs.scss'))
            .pipe(gulp.dest('app/scss'))
            .pipe(browserSync.reload({ stream: true }))
    );
});

gulp.task('html', function () {
    return gulp.src('app/*.html').pipe(browserSync.reload({ stream: true }));
});

gulp.task('script', function () {
    return gulp.src('app/js/*.js').pipe(browserSync.reload({ stream: true }));
});

gulp.task('js', function () {
    return gulp
        .src(['node_modules/plyr/dist/plyr.js', 'node_modules/granim/dist/granim.js', 'node_modules/aos/dist/aos.js', 'node_modules/sweetalert2/dist/sweetalert2.all.js'])
        .pipe(concat('libs.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('app/js'))
        .pipe(browserSync.reload({ stream: true }));
});

gulp.task('browser-sync', function () {
    browserSync.init({
        server: {
            baseDir: 'app/',
        },
        tunnel: true,
    });
});

gulp.task('purgecss', () => {
    return gulp
        .src('app/css/*.css')
        .pipe(
            purgecss({
                content: ['app/*.html'],
            })
        )
        .pipe(gulp.dest('app/purecss'));
});

gulp.task('export', async function () {
    let buildHtml = gulp.src('app/**/*.html').pipe(gulp.dest('dist'));

    let copyGitignore = gulp.src('app/.gitignore').pipe(gulp.dest('dist'));

    let copyREADME = gulp.src('app/README.md').pipe(gulp.dest('dist'));

    let BuildCss = gulp
        .src('app/css/**/*.css')
        .pipe(sass({ outputStyle: 'compressed' }))
        .pipe(gulp.dest('dist/css'));

    let BuildJs = gulp.src('app/js/**/*.js').pipe(gulp.dest('dist/js'));

    let BuildFonts = gulp.src('app/fonts/**/*.*').pipe(gulp.dest('dist/fonts'));

    let BuildImg = gulp.src('app/images/**/*.*').pipe(gulp.dest('dist/images'));
});

gulp.task('watch', function () {
    gulp.watch('app/scss/**/*.scss', gulp.parallel('scss'));
    gulp.watch('app/*.html', gulp.parallel('html'));
    gulp.watch('app/js/*.js', gulp.parallel('script'));
});

gulp.task('build', gulp.series('clean', 'export'));

gulp.task('default', gulp.parallel('css', 'scss', 'js', 'browser-sync', 'watch'));
