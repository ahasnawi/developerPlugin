const gulp = require('gulp');
const { rimraf } = require('rimraf');
const minHTML = require('gulp-htmlmin');
const minifyCSS = require('gulp-csso');
const concat = require('gulp-concat');
const htmlReplace = require('gulp-html-replace');
const uglify = require('gulp-uglify');
const eslint = require('gulp-eslint');
const babel = require('gulp-babel');

const destinationFolder= releaseFolder();

function releaseFolder() {
    var arr = __dirname.split("/");
    var fldr = arr.pop();
    arr.push(fldr + "_release");
    return arr.join("/");
}

console.log(">> Building to " , destinationFolder);


const cssTasks=[
    {name:"widgetCSS",src:"widget/**/*.css",dest:"/widget"}
    ,{name:"controlContentCSS",src:"control/content/**/*.css",dest:"/control/content"}
    ,{name:"controlDesignCSS",src:"control/design/**/*.css",dest:"/control/design"}
    ,{name:"controlSettingsCSS",src:"control/settings/**/*.css",dest:"/control/settings"}
];

cssTasks.forEach(function(task){
    /*
     Define a task called 'css' the recursively loops through
     the widget and control folders, processes each CSS file and puts
     a processes copy in the 'build' folder
     note if the order matters you can import each css separately in the array

     */
    gulp.task(task.name, function(){
        return gulp.src(task.src,{base: '.'})

        /// minify the CSS contents
            .pipe(minifyCSS())

            ///merge
            .pipe(concat('styles.min.css'))

            /// write result to the 'build' folder
            .pipe(gulp.dest(destinationFolder + task.dest))
    });
});

const jsTasks=[
    {name:"widgetJS",src:"widget/**/*.js",dest:"/widget",excludeFiles:[]}
    ,{name:"controlContentJS",src:"control/content/**/*.js",dest:"/control/content",excludeFiles:["!control/content/js/monaco-editor/**"]}
    ,{name:"controlDesignJS",src:"control/design/**/*.js",dest:"/control/design",excludeFiles:[]}
    ,{name:"controlSettingsJS",src:"control/settings/**/*.js",dest:"/control/settings",excludeFiles:[]}
];


gulp.task('lint', () => {
    return gulp.src([
        'widget/**/*.js',
        'control/**/*.js',
        '!control/content/js/monaco-editor/**',
    ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

jsTasks.forEach(function(task){
    gulp.task(task.name, function() {
        const srcPatterns = [task.src, ...task.excludeFiles];
        return gulp.src(srcPatterns, {base: '.'})
            .pipe(babel({ presets: ['@babel/preset-env'] }))
            .pipe(uglify())
            .pipe(concat('scripts.min.js'))
            .pipe(gulp.dest(destinationFolder + task.dest));
    });
});

gulp.task('clean', function() {
    return rimraf(destinationFolder);
});

/*
 Define a task called 'html' the recursively loops through
 the widget and control folders, processes each html file and puts
 a processes copy in the 'build' folder
 */
gulp.task('html', function(){
    return gulp.src(['widget/**/*.html','control/**/*.html'],{base: '.'})
    /// replace all the <!-- build:bundleJSFiles  --> comment bodies
    /// with scripts.min.js with cache buster
        .pipe(htmlReplace({
            bundleJSFiles:"scripts.min.js?v=" + (new Date().getTime())
            ,bundleCSSFiles:"styles.min.css?v=" + (new Date().getTime())
        }))

        /// then strip the html from any comments
        .pipe(minHTML({removeComments:true,collapseWhitespace:true}))

        /// write results to the 'build' folder
        .pipe(gulp.dest(destinationFolder));
});

gulp.task('resources', function(){
    return gulp.src(['resources/*','plugin.json'],{base: '.'})
        .pipe(gulp.dest(destinationFolder));
});

gulp.task('monaco', function() {
    return gulp.src('control/content/js/monaco-editor/**/*', { base: '.' })
        .pipe(gulp.dest(destinationFolder));
});

gulp.task('fonts', function() {
    return gulp.src(['**/*.{woff,woff2,ttf,eot,otf}'], { base: '.' })
        .pipe(gulp.dest(destinationFolder));
});


const buildTasksToRun = [
    'html',
    'resources',
    ...cssTasks.map(task => task.name),
    ...jsTasks.map(task => task.name),
    'monaco',
    'fonts'
];

const build = gulp.series(
    'lint',
    'clean',
    gulp.parallel(...buildTasksToRun)
);

gulp.task('build', build);
gulp.task('default', build);
