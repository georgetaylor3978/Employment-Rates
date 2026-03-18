import requests
import zipfile
import io
import pandas as pd

# Get the download URL
url = "https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/14100287/en"
response = requests.get(url).json()

if response['status'] == 'SUCCESS':
    download_url = response['object']
    print(f"Downloading from {download_url}")
    
    # Download the zip
    zip_resp = requests.get(download_url)
    with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as archive:
        # There should be a CSV file with the data
        csv_filename = '14100287.csv'
        with archive.open(csv_filename) as file:
            # Read a chunk to see columns
            df = pd.read_csv(file, nrows=1000)
            print("Columns:", df.columns.tolist())
            
            # Re-read to get unique values for Labour force characteristics
            # Since dataset is huge, we'll read only a subset or read columns
            pass
            
        with archive.open(csv_filename) as file:
            header = pd.read_csv(file, nrows=0).columns
            usecols = ['REF_DATE', 'GEO', 'Labour force characteristics', 'Sex', 'Age group', 'Statistics', 'Data type', 'VALUE']
            # only keep rows we need for employment, unemployed, etc.
            
            df = pd.read_csv(file, usecols=lambda c: c in usecols)
            print("\nUnique Labour force characteristics:")
            for val in df['Labour force characteristics'].unique():
                print(val)
                
            print("\nUnique Statistics:")
            for val in df['Statistics'].unique():
                print(val)
else:
    print("Failed to get download URL")
