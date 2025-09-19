import os
from datetime import datetime, timezone
from typing import Dict, Any
import random
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('../.env.local')
print('The env is loaded')

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")

print(f'supabase_url: {supabase_url}')
print(f'supabase_key: {supabase_key}')

supabase: Client = create_client(supabase_url, supabase_key)

supabase.auth.sign_in_with_password({
    "email": "smlgroot@gmail.com",
    "password": "12345678"
})

def generate_mock_questions(domain_id: str, num_questions: int = 5) -> Dict[str, Any]:
    """
    Generates mock questions and options for a specific domain and saves them to Supabase.
    Returns the created questions data.
    """
    
    # Get current user ID (you may need to adjust this based on your auth setup)
    user = supabase.auth.get_user()

    print(f'user: {user}')

    if user.user:
        author_id = user.user.id
    else:
        raise Exception("User not found")
    
    questions_created = []
    
    # Generate questions
    for i in range(num_questions):
        question_data = {
            "domain_id": domain_id,
            "author_id": author_id,
            "type": "multiple_choice",
            "body": f"Mock Question {i+1}: What is the correct answer?",
            "explanation": f"This is the explanation for question {i+1}. It provides detailed reasoning about why the correct answer is correct.",
            "difficulty": random.choice(["easy", "medium", "hard"])
        }
        
        # Insert question
        question_result = supabase.table("questions").insert(question_data).execute()
        question_id = question_result.data[0]["id"]
        
        # Generate options for each question
        num_options = random.randint(3, 4)
        correct_option = random.randint(0, num_options-1)
        
        options_created = []
        
        for j in range(num_options):
            option_data = {
                "question_id": question_id,
                "domain_id": domain_id,
                "label": f"Option {j+1} for question {i+1}",
                "is_correct": (j == correct_option),
                "order_index": j,
                "why": f"This option is {'correct' if j == correct_option else 'incorrect'} because it {'accurately answers' if j == correct_option else 'does not properly address'} the question."
            }
            
            # Insert option
            option_result = supabase.table("question_options").insert(option_data).execute()
            options_created.append(option_result.data[0])
        
        question_info = {
            "question": question_result.data[0],
            "options": options_created
        }
        questions_created.append(question_info)

    return {
        "domain_id": domain_id,
        "questions_created": len(questions_created),
        "questions": questions_created
    }

if __name__ == "__main__":
    result = generate_mock_questions(domain_id='9655c072-da66-4bef-916d-60b75db262df', num_questions=10)
    print(f"Created {result['questions_created']} questions for domain {result['domain_id']}")