-- Add food truck reviews table for internal quality assessments
CREATE TABLE IF NOT EXISTS media_food_truck_reviews (
  id SERIAL PRIMARY KEY,
  food_truck_id INTEGER NOT NULL REFERENCES media_food_trucks(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  food_quality TEXT,
  service_quality TEXT,
  cleanliness TEXT,
  professionalism TEXT,
  overall_notes TEXT,
  would_recommend BOOLEAN NOT NULL DEFAULT true,
  reviewed_by VARCHAR(255),
  review_date VARCHAR(10) NOT NULL, -- YYYY-MM-DD format
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_truck_review_truck ON media_food_truck_reviews(food_truck_id);
CREATE INDEX IF NOT EXISTS idx_food_truck_review_date ON media_food_truck_reviews(review_date);
