module.exports = platform => [{
  name: () => `${platform}/build.gradle`,
  content: ({ packageIdentifier }) => `// ${platform}/build.gradle

// based on:
//
// * https://github.com/facebook/react-native/blob/0.60-stable/template/android/build.gradle
//   original location:
//   - https://github.com/facebook/react-native/blob/0.58-stable/local-cli/templates/HelloWorld/android/build.gradle
//
// * https://github.com/facebook/react-native/blob/0.60-stable/template/android/app/build.gradle
//   original location:
//   - https://github.com/facebook/react-native/blob/0.58-stable/local-cli/templates/HelloWorld/android/app/build.gradle

def DEFAULT_COMPILE_SDK_VERSION = 28
def DEFAULT_BUILD_TOOLS_VERSION = '28.0.3'
def DEFAULT_MIN_SDK_VERSION = 16
def DEFAULT_TARGET_SDK_VERSION = 28

def safeExtGet(prop, fallback) {
    rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

apply plugin: 'com.android.library'
apply plugin: 'maven'

buildscript {
    // The Android Gradle plugin is only required when opening the android folder stand-alone.
    // This avoids unnecessary downloads and potential conflicts when the library is included as a
    // module dependency in an application project.
    // ref: https://docs.gradle.org/current/userguide/tutorial_using_tasks.html#sec:build_script_external_dependencies
    if (project == rootProject) {
        repositories {
            google()
            jcenter()
        }
        dependencies {
            classpath 'com.android.tools.build:gradle:3.4.1'
        }
    }
}

apply plugin: 'com.android.library'
apply plugin: 'maven'

android {
    compileSdkVersion safeExtGet('compileSdkVersion', DEFAULT_COMPILE_SDK_VERSION)
    buildToolsVersion safeExtGet('buildToolsVersion', DEFAULT_BUILD_TOOLS_VERSION)
    defaultConfig {
        minSdkVersion safeExtGet('minSdkVersion', DEFAULT_MIN_SDK_VERSION)
        targetSdkVersion safeExtGet('targetSdkVersion', DEFAULT_TARGET_SDK_VERSION)
        versionCode 1
        versionName "1.0"
    }
    lintOptions {
        abortOnError false
    }
}

repositories {
    // ref: https://www.baeldung.com/maven-local-repository
    mavenLocal()
    maven {
        // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
        url "$rootDir/../node_modules/react-native/android"
    }
    maven {
        // Android JSC is installed from npm
        url "$rootDir/../node_modules/jsc-android/dist"
    }
    google()
    jcenter()
}

dependencies {
    //noinspection GradleDynamicVersion
    implementation 'com.facebook.react:react-native:+'  // From node_modules
}

def configureReactNativePom(def pom) {
    def packageJson = new groovy.json.JsonSlurper().parseText(file('../package.json').text)

    pom.project {
        name packageJson.title
        artifactId packageJson.name
        version = packageJson.version
        group = "${packageIdentifier}"
        description packageJson.description
        url packageJson.repository.baseUrl

        licenses {
            license {
                name packageJson.license
                url packageJson.repository.baseUrl + '/blob/master/' + packageJson.licenseFilename
                distribution 'repo'
            }
        }

        developers {
            developer {
                id packageJson.author.username
                name packageJson.author.name
            }
        }
    }
}

afterEvaluate { project ->
    // some Gradle build hooks ref:
    // https://www.oreilly.com/library/view/gradle-beyond-the/9781449373801/ch03.html
    task androidJavadoc(type: Javadoc) {
        source = android.sourceSets.main.java.srcDirs
        classpath += files(android.bootClasspath)
        classpath += files(project.getConfigurations().getByName('compile').asList())
        include '**/*.java'
    }

    task androidJavadocJar(type: Jar, dependsOn: androidJavadoc) {
        classifier = 'javadoc'
        from androidJavadoc.destinationDir
    }

    task androidSourcesJar(type: Jar) {
        classifier = 'sources'
        from android.sourceSets.main.java.srcDirs
        include '**/*.java'
    }

    android.libraryVariants.all { variant ->
        def name = variant.name.capitalize()
        def javaCompileTask = variant.javaCompileProvider.get()

        task "jar\${name}"(type: Jar, dependsOn: javaCompileTask) {
            from javaCompileTask.destinationDir
        }
    }

    artifacts {
        archives androidSourcesJar
        archives androidJavadocJar
    }

    task installArchives(type: Upload) {
        configuration = configurations.archives
        repositories.mavenDeployer {
            // Deploy to react-native-event-bridge/maven, ready to publish to npm
            repository url: "file://\${projectDir}/../android/maven"
            configureReactNativePom pom
        }
    }
}
`,
}, {
  name: () => `${platform}/src/main/AndroidManifest.xml`,
  content: ({ packageIdentifier }) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="${packageIdentifier}">

</manifest>
`,
}, {
  // for module without view:
  name: ({ packageIdentifier, name, view }) =>
    !view &&
      `${platform}/src/main/java/${packageIdentifier.split('.').join('/')}/${name}Module.java`,
  content: ({ packageIdentifier, name, view }) =>
    !view &&
      `package ${packageIdentifier};

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;

public class ${name}Module extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public ${name}Module(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "${name}";
    }

    @ReactMethod
    public void sampleMethod(String stringArgument, int numberArgument, Callback callback) {
        // TODO: Implement some actually useful functionality
        callback.invoke("Received numberArgument: " + numberArgument + " stringArgument: " + stringArgument);
    }
}
`,
}, {
  // manager for view:
  name: ({ packageIdentifier, name, view }) =>
    view &&
      `${platform}/src/main/java/${packageIdentifier.split('.').join('/')}/${name}Manager.java`,
  content: ({ packageIdentifier, name, view }) =>
    view &&
      `package ${packageIdentifier};

import android.view.View;

import androidx.appcompat.widget.AppCompatCheckBox;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;

public class ${name}Manager extends SimpleViewManager<View> {

    public static final String REACT_CLASS = "${name}";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    public View createViewInstance(ThemedReactContext c) {
        // TODO: Implement some actually useful functionality
        AppCompatCheckBox cb = new AppCompatCheckBox(c);
        cb.setChecked(true);
        return cb;
    }
}
`,
}, {
  // package for module without view:
  name: ({ packageIdentifier, name, view }) =>
    !view &&
      `${platform}/src/main/java/${packageIdentifier.split('.').join('/')}/${name}Package.java`,
  content: ({ packageIdentifier, name, view }) =>
    !view &&
      `package ${packageIdentifier};

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.bridge.JavaScriptModule;

public class ${name}Package implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Arrays.<NativeModule>asList(new ${name}Module(reactContext));
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`,
}, {
  // package for manager for view:
  name: ({ packageIdentifier, name, view }) =>
    view &&
      `${platform}/src/main/java/${packageIdentifier.split('.').join('/')}/${name}Package.java`,
  content: ({ packageIdentifier, name, view }) =>
    view &&
      `package ${packageIdentifier};

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.bridge.JavaScriptModule;

public class ${name}Package implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Arrays.<ViewManager>asList(new ${name}Manager());
    }
}
`,
}];
