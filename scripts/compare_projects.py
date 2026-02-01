import os
import filecmp
import difflib

DEV_DIR = "/home/ganapathiraj/Code/AndroidDevelopment/SriBagavathDevClean"
PROD_DIR = "/home/ganapathiraj/Code/AndroidDevelopment/SriBagavath"

IGNORE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.gradle', '.idea', 'android/build', 'android/.gradle', 'android/app/build'
}

IGNORE_FILES = {
    '.DS_Store', 'package-lock.json', 'sri-bagavath-dev-firebase-adminsdk-fbsvc-b3da295cc2.json'
}

EXPECTED_DIFFS = {
    'android/app/src/main/res/values/strings.xml',
    'android/app/google-services.json',
    'android/app/build.gradle',
    'capacitor.config.json',
    '.env',
    '.env.production',
    'sync_to_prod.sh', # Might not exist in prod or be diff
    'sync_to_dev.sh',
    'README.md',
    'publish.sh',
    'publish_latest.sh'
}

def is_ignored(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS:
            return True
    if os.path.basename(path) in IGNORE_FILES:
        return True
    return False

def compare_dirs(dir1, dir2):
    dc = filecmp.dircmp(dir1, dir2, ignore=['node_modules', '.git', 'dist', 'build', '.gradle', '.idea', '__pycache__'])
    
    # helper to print recursive results
    def print_diff_files(d_cmp, relative_path=""):
        # Files only in Dev
        for name in d_cmp.left_only:
            full_rel_path = os.path.join(relative_path, name)
            if not is_ignored(full_rel_path):
                print(f"ONLY IN DEV: {full_rel_path}")

        # Files only in Prod
        for name in d_cmp.right_only:
            full_rel_path = os.path.join(relative_path, name)
            if not is_ignored(full_rel_path):
                print(f"ONLY IN PROD: {full_rel_path}")

        # Different Files
        for name in d_cmp.diff_files:
            full_rel_path = os.path.join(relative_path, name)
            if not is_ignored(full_rel_path):
                if full_rel_path in EXPECTED_DIFFS:
                    print(f"DIFFERENT (EXPECTED): {full_rel_path}")
                else:
                    print(f"DIFFERENT (UNEXPECTED): {full_rel_path}")

        for sub_dir_name, sub_dc in d_cmp.subdirs.items():
            print_diff_files(sub_dc, os.path.join(relative_path, sub_dir_name))

    print(f"Comparing:\nDev: {dir1}\nProd: {dir2}")
    print("-" * 40)
    print_diff_files(dc)

if __name__ == "__main__":
    compare_dirs(DEV_DIR, PROD_DIR)
