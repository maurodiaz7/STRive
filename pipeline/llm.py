from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from openai import OpenAI
import json
import os
load_dotenv()

# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
OPENAI_API_KEY = ""
client = OpenAI(api_key=OPENAI_API_KEY)

def get_only_urls(response_text):
    return extract_urls_from_response(response_text)

def extract_urls_from_response(response_text):
    import re
    url_pattern = r'https://[^\s\"\'\)]*'
    urls = re.findall(url_pattern, response_text)
    
    cleaned_urls = []
    for url in urls:
        url = re.sub(r'[,\.\)\]\}]+$', '', url)
        cleaned_urls.append(url)
    
    return cleaned_urls

def request_openai(dict_selected):
    conditional_if = dict_selected['antecedent']
    consequence = dict_selected['consequent']
    info = dict_selected['timeline']
    
    all_locations = list(set([x['location'] for x in info]))

    info_str = ''

    for location in all_locations:
        location_data = [x for x in info if x['location'] == location]
        info_str += 'Location:' + location + '\n'
        for element in location_data:
            info_str += element['date'] + ': ' + str(element['count']) + '\n'
        
        info_str += '\n'

    user_prompt_content = f"""
    Here we have an association rule, describing a pattern found on a vehicular accidents dataset.
    The components of the rule are key-value pairs, which indicate categorical attributes and their values.

    Antecedent: {conditional_if}
    Consequent: {consequence}

    The dataset was split in monthly slices. This is an array containing the aggregated number of elements in the dataset satisfying the rule.
    Each has location, date, and count fields, representing the aggregated count of accidents in a specific location at a specific date.
    
    {info_str}

    Identify places/dates with high intensity peaks, stable behavior or behavioral shifts both in time and space.
    Formulate a couple specific hypotheses explaining the identified behavior and search the internet for information sources to validate your hypothesis.
    Be brief, only answer with the explanation and a couple of sources to validate it.
    The valid sources are news, official reports, research articles and even books. If you find any other type of source from the web, include it.
    If there are no valid information sources just give the explanation.

    Output Format (strictly valid JSON only):
    {{
            "hypothesis": "",
            "description": "",
    }}

    Do not include inexisting urls in the sources field.
    """

    prompt = [
        {"role": "user", "content": user_prompt_content}
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=prompt,
        temperature=0.2,
        max_tokens=400,
        response_format={"type": "json_object"},
    )
    
    return response.choices[0].message.content
    
from google import genai
from google.genai.types import Tool, GenerateContentConfig, GoogleSearch

def request_gemini(dict_selected):
    conditional_if = dict_selected['antecedent']
    consequence = dict_selected['consequent']
    info = dict_selected['timeline']

    all_locations = list(set([x['location'] for x in info]))

    info_str = ''

    for location in all_locations:
        location_data = [x for x in info if x['location'] == location]
        info_str += 'Location:' + location + '\n'
        for element in location_data:
            info_str += element['date'] + ': ' + str(element['count']) + '\n'

        info_str += '\n'

    user_prompt_content = f"""
            Here we have an association rule, describing a pattern found in a vehicular accident dataset.
            
            Antecedent: {conditional_if}
            Consequent: {consequence}
            
            {info_str}
            
            Task:
            1. Identify trends both in time and space.
            2. Formulate a couple specific hypotheses explaining the identified behavior.
            3. Search the internet for information sources to validate your hypothesis. 
            3. Use the Google Search tool to find specific news articles, reports, and studies
            4. Provide actual working URLs, not placeholder URLs.
            
            If no information was found, just return the hypothesis and description. Do not put links in the description, only in the sources.

            Output the findings as a JSON list of dictionaries with the following format (strictly valid JSON only):
            {{
                    "hypothesis": "",
                    "description": "",
                    "sources": []
            }}
            Output each source as a JSON dictionary with title and URL:
            {{
                "title": "",
                "url": "",
            }}
            Provide only the requested JSON. Do not output text outside the JSON.
    """

    client = genai.Client(api_key="")
    model_id = "gemini-2.0-flash"

    google_search_tool = Tool(
        google_search=GoogleSearch()
    )

    response = client.models.generate_content(
        model=model_id,
        contents=user_prompt_content,
        config=GenerateContentConfig(
            tools=[google_search_tool],
            response_modalities=["TEXT"],
            tool_config={"function_calling_config": {"mode": "ANY"}}
        )
    )

    full_text = "".join([part.text for part in response.candidates[0].content.parts if part.text])
    return full_text

def response_llm(dict_selected):
    with ThreadPoolExecutor(max_workers=2) as executor:
        # future_openai = executor.submit(request_openai, dict_selected)
        future_gemini = executor.submit(request_gemini, dict_selected)
        
        json_llm_str = future_gemini.result()
        # urls = future_gemini.result()
    
    cleaned = json_llm_str.strip().removeprefix("```json").removesuffix("```").strip()

    json_llm = json.loads(cleaned)
    
    for i in range(len(json_llm)):
        sources = json_llm[i]['sources']
        sources = [x['url'] for x in sources]
        json_llm[i]['sources'] = sources

    return {'response': json_llm}
