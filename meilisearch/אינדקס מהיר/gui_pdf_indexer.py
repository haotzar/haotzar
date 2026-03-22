import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import queue
from pathlib import Path
import sys
import os
from multiprocessing import freeze_support

# Import the indexing functions
from create_pdf_pages_index import (
    iter_pdf_paths,
    meili_check_connection,
    meili_create_index,
    meili_get_index_stats,
    page_extractor,
    process_single_pdf,
    upload_batch_session,
    meili_wait_for_task,
)
from multiprocessing import Pool, cpu_count
import time
import requests


class PDFIndexerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("מאנדקס PDF - Meilisearch")
        self.root.geometry("900x750")
        self.root.resizable(True, True)
        
        # Configure colors - modern palette
        self.bg_color = "#f8f9fa"
        self.accent_color = "#4CAF50"
        self.secondary_color = "#2196F3"
        self.danger_color = "#f44336"
        self.text_color = "#212529"
        self.border_color = "#dee2e6"
        
        self.root.configure(bg=self.bg_color)
        
        # Configure RTL support
        self.root.option_add('*Font', 'Arial 10')
        
        # Queue for thread communication
        self.log_queue = queue.Queue()
        self.is_running = False
        
        self.create_widgets()
        self.check_log_queue()
        
    def create_widgets(self):
        # Main container with padding
        main_frame = tk.Frame(self.root, bg=self.bg_color, padx=25, pady=20)
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        
        # Header Frame with gradient effect
        header_frame = tk.Frame(main_frame, bg=self.accent_color, height=80)
        header_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 25))
        header_frame.columnconfigure(0, weight=1)
        header_frame.grid_propagate(False)
        
        # Title
        title_label = tk.Label(
            header_frame,
            text="מאנדקס PDF למיילסרץ'",
            font=("Arial", 26, "bold"),
            bg=self.accent_color,
            fg="white"
        )
        title_label.pack(expand=True)
        
        subtitle_label = tk.Label(
            header_frame,
            text="כלי לאינדוקס מהיר של קבצי PDF",
            font=("Arial", 11),
            bg=self.accent_color,
            fg="white"
        )
        subtitle_label.pack()
        
        # Settings Frame
        settings_frame = tk.LabelFrame(
            main_frame,
            text="  הגדרות בסיסיות  ",
            font=("Arial", 12, "bold"),
            bg=self.bg_color,
            fg=self.text_color,
            relief=tk.FLAT,
            borderwidth=2,
            highlightthickness=1,
            highlightbackground=self.border_color,
            padx=20,
            pady=15
        )
        settings_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 15))
        settings_frame.columnconfigure(0, weight=1)
        
        # PDF Input Path
        pdf_label = tk.Label(settings_frame, text="תיקיית PDF:", font=("Arial", 10, "bold"), bg=self.bg_color, fg=self.text_color, anchor="e")
        pdf_label.grid(row=0, column=1, sticky=tk.E, pady=8, padx=(0, 10))
        
        self.pdf_path_var = tk.StringVar(value=r"F:\haotzar\books\hebrewbooks")
        pdf_path_frame = tk.Frame(settings_frame, bg=self.bg_color)
        pdf_path_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=8)
        pdf_path_frame.columnconfigure(0, weight=1)
        
        pdf_entry = tk.Entry(
            pdf_path_frame,
            textvariable=self.pdf_path_var,
            font=("Arial", 10),
            relief=tk.SOLID,
            borderwidth=1,
            bg="white"
        )
        pdf_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), ipady=5)
        
        browse_btn = tk.Button(
            pdf_path_frame,
            text="📁 עיון",
            command=self.browse_folder,
            font=("Arial", 9),
            bg=self.secondary_color,
            fg="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=15,
            pady=5
        )
        browse_btn.grid(row=0, column=1, padx=(8, 0))
        
        # Meilisearch URL
        meili_label = tk.Label(settings_frame, text="Meilisearch URL:", font=("Arial", 10, "bold"), bg=self.bg_color, fg=self.text_color, anchor="e")
        meili_label.grid(row=1, column=1, sticky=tk.E, pady=8, padx=(0, 10))
        
        self.meili_url_var = tk.StringVar(value="http://127.0.0.1:7700")
        meili_entry = tk.Entry(
            settings_frame,
            textvariable=self.meili_url_var,
            font=("Arial", 10),
            relief=tk.SOLID,
            borderwidth=1,
            bg="white"
        )
        meili_entry.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=8, ipady=5)
        
        # Index Name
        index_label = tk.Label(settings_frame, text="שם אינדקס:", font=("Arial", 10, "bold"), bg=self.bg_color, fg=self.text_color, anchor="e")
        index_label.grid(row=2, column=1, sticky=tk.E, pady=8, padx=(0, 10))
        
        self.index_name_var = tk.StringVar(value="pdf_pages")
        index_entry = tk.Entry(
            settings_frame,
            textvariable=self.index_name_var,
            font=("Arial", 10),
            relief=tk.SOLID,
            borderwidth=1,
            bg="white"
        )
        index_entry.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=8, ipady=5)
        
        # Options Frame
        options_frame = tk.LabelFrame(
            main_frame,
            text="  אפשרויות מתקדמות  ",
            font=("Arial", 12, "bold"),
            bg=self.bg_color,
            fg=self.text_color,
            relief=tk.FLAT,
            borderwidth=2,
            highlightthickness=1,
            highlightbackground=self.border_color,
            padx=20,
            pady=15
        )
        options_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 15))
        options_frame.columnconfigure(0, weight=1)
        
        # Create two columns for options
        left_options = tk.Frame(options_frame, bg=self.bg_color)
        left_options.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))
        left_options.columnconfigure(0, weight=1)
        
        right_options = tk.Frame(options_frame, bg=self.bg_color)
        right_options.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(10, 0))
        right_options.columnconfigure(0, weight=1)
        
        # Batch Size
        batch_frame = tk.Frame(left_options, bg=self.bg_color)
        batch_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(batch_frame, text="גודל אצווה:", font=("Arial", 10, "bold"), bg=self.bg_color, fg=self.text_color, anchor="e").pack(side=tk.RIGHT, padx=(0, 10))
        
        self.batch_size_var = tk.IntVar(value=500)
        batch_spinbox = tk.Spinbox(
            batch_frame,
            from_=50,
            to=2000,
            textvariable=self.batch_size_var,
            width=12,
            font=("Arial", 10),
            relief=tk.SOLID,
            borderwidth=1,
            justify=tk.RIGHT
        )
        batch_spinbox.pack(side=tk.RIGHT)
        
        # Number of Workers
        workers_frame = tk.Frame(left_options, bg=self.bg_color)
        workers_frame.pack(fill=tk.X, pady=5)
        
        tk.Label(workers_frame, text="מספר תהליכים:", font=("Arial", 10, "bold"), bg=self.bg_color, fg=self.text_color, anchor="e").pack(side=tk.RIGHT, padx=(0, 10))
        
        self.workers_var = tk.IntVar(value=min(4, cpu_count()))
        workers_spinbox = tk.Spinbox(
            workers_frame,
            from_=1,
            to=cpu_count(),
            textvariable=self.workers_var,
            width=12,
            font=("Arial", 10),
            relief=tk.SOLID,
            borderwidth=1,
            justify=tk.RIGHT
        )
        workers_spinbox.pack(side=tk.RIGHT)
        
        # Skip Empty Pages
        self.skip_empty_var = tk.BooleanVar(value=True)
        skip_check = tk.Checkbutton(
            right_options,
            text="דלג על עמודים ריקים",
            variable=self.skip_empty_var,
            font=("Arial", 10),
            bg=self.bg_color,
            fg=self.text_color,
            selectcolor="white",
            activebackground=self.bg_color,
            anchor="e",
            justify=tk.RIGHT
        )
        skip_check.pack(anchor=tk.E, pady=5)
        
        # Wait for Tasks
        self.wait_tasks_var = tk.BooleanVar(value=True)
        wait_check = tk.Checkbutton(
            right_options,
            text="המתן לסיום משימות",
            variable=self.wait_tasks_var,
            font=("Arial", 10),
            bg=self.bg_color,
            fg=self.text_color,
            selectcolor="white",
            activebackground=self.bg_color,
            anchor="e",
            justify=tk.RIGHT
        )
        wait_check.pack(anchor=tk.E, pady=5)
        
        # Progress Frame
        progress_frame = tk.Frame(main_frame, bg=self.bg_color)
        progress_frame.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=(0, 15))
        progress_frame.columnconfigure(0, weight=1)
        
        self.status_label = tk.Label(
            progress_frame,
            text="מוכן להתחלה",
            font=("Arial", 11, "bold"),
            bg=self.bg_color,
            fg=self.text_color,
            anchor="center"
        )
        self.status_label.grid(row=0, column=0, pady=(0, 8))
        
        # Progress bar container for styling
        progress_container = tk.Frame(progress_frame, bg="white", relief=tk.SOLID, borderwidth=1)
        progress_container.grid(row=1, column=0, sticky=(tk.W, tk.E))
        
        self.progress_var = tk.DoubleVar()
        
        # Custom style for progress bar
        style = ttk.Style()
        style.theme_use('clam')
        style.configure(
            "Custom.Horizontal.TProgressbar",
            troughcolor='white',
            background=self.accent_color,
            borderwidth=0,
            thickness=25
        )
        
        self.progress_bar = ttk.Progressbar(
            progress_container,
            variable=self.progress_var,
            maximum=100,
            mode='determinate',
            style="Custom.Horizontal.TProgressbar"
        )
        self.progress_bar.pack(fill=tk.BOTH, expand=True)
        
        # Log Frame
        log_frame = tk.LabelFrame(
            main_frame,
            text="  לוג פעילות  ",
            font=("Arial", 12, "bold"),
            bg=self.bg_color,
            fg=self.text_color,
            relief=tk.FLAT,
            borderwidth=2,
            highlightthickness=1,
            highlightbackground=self.border_color,
            padx=15,
            pady=10
        )
        log_frame.grid(row=4, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 15))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            height=12,
            wrap=tk.WORD,
            font=("Consolas", 9),
            bg="#ffffff",
            fg=self.text_color,
            relief=tk.FLAT,
            borderwidth=0,
            padx=10,
            pady=10
        )
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Buttons Frame
        buttons_frame = tk.Frame(main_frame, bg=self.bg_color)
        buttons_frame.grid(row=5, column=0, pady=(0, 0))
        
        self.stop_button = tk.Button(
            buttons_frame,
            text="⏹ עצור",
            command=self.stop_indexing,
            font=("Arial", 13, "bold"),
            bg=self.danger_color,
            fg="white",
            padx=40,
            pady=12,
            relief=tk.FLAT,
            cursor="hand2",
            state=tk.DISABLED,
            borderwidth=0
        )
        self.stop_button.grid(row=0, column=0, padx=8)
        
        self.start_button = tk.Button(
            buttons_frame,
            text="▶ התחל אינדוקס",
            command=self.start_indexing,
            font=("Arial", 13, "bold"),
            bg=self.accent_color,
            fg="white",
            padx=40,
            pady=12,
            relief=tk.FLAT,
            cursor="hand2",
            borderwidth=0
        )
        self.start_button.grid(row=0, column=1, padx=8)
        
        # Add hover effects
        self.start_button.bind("<Enter>", lambda e: self.start_button.config(bg="#45a049"))
        self.start_button.bind("<Leave>", lambda e: self.start_button.config(bg=self.accent_color))
        
        self.stop_button.bind("<Enter>", lambda e: self.stop_button.config(bg="#da190b") if self.stop_button['state'] == 'normal' else None)
        self.stop_button.bind("<Leave>", lambda e: self.stop_button.config(bg=self.danger_color) if self.stop_button['state'] == 'normal' else None)
        
    def browse_folder(self):
        folder = filedialog.askdirectory(title="בחר תיקיית PDF")
        if folder:
            self.pdf_path_var.set(folder)
    
    def log(self, message):
        self.log_queue.put(message)
    
    def check_log_queue(self):
        try:
            while True:
                message = self.log_queue.get_nowait()
                self.log_text.insert(tk.END, message + "\n")
                self.log_text.see(tk.END)
        except queue.Empty:
            pass
        self.root.after(100, self.check_log_queue)
    
    def start_indexing(self):
        if self.is_running:
            return
        
        # Validate inputs
        if not self.pdf_path_var.get():
            messagebox.showerror("שגיאה", "נא לבחור תיקיית PDF")
            return
        
        if not self.meili_url_var.get():
            messagebox.showerror("שגיאה", "נא להזין URL של Meilisearch")
            return
        
        if not self.index_name_var.get():
            messagebox.showerror("שגיאה", "נא להזין שם אינדקס")
            return
        
        self.is_running = True
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        self.progress_var.set(0)
        self.status_label.config(text="מתחיל...")
        
        # Start indexing in a separate thread
        thread = threading.Thread(target=self.run_indexing, daemon=True)
        thread.start()
    
    def stop_indexing(self):
        self.is_running = False
        self.log("עצירה מבוקשת...")
    
    def run_indexing(self):
        try:
            pdf_inputs = [self.pdf_path_var.get()]
            meili_url = self.meili_url_var.get()
            index_name = self.index_name_var.get()
            batch_size = self.batch_size_var.get()
            num_workers = self.workers_var.get()
            skip_empty = self.skip_empty_var.get()
            wait_tasks = self.wait_tasks_var.get()
            
            self.log("מחפש קבצי PDF...")
            pdf_paths = iter_pdf_paths(pdf_inputs)
            
            if not pdf_paths:
                self.log("לא נמצאו קבצי PDF")
                self.finish_indexing(False)
                return
            
            self.log(f"נמצאו {len(pdf_paths):,} קבצי PDF")
            self.log(f"משתמש ב-{num_workers} תהליכים מקבילים")
            
            # Check Meilisearch connection
            self.log("בודק חיבור ל-Meilisearch...")
            if not meili_check_connection(meili_url, timeout_seconds=10):
                self.log("שגיאה: לא ניתן להתחבר ל-Meilisearch")
                self.log(f"URL: {meili_url}")
                self.finish_indexing(False)
                return
            
            self.log("חיבור ל-Meilisearch הצליח")
            
            # Test PDF extraction
            try:
                _ = page_extractor(pdf_paths[0])
            except Exception as e:
                self.log(f"שגיאה: {e}")
                self.finish_indexing(False)
                return
            
            # Create index
            self.log(f"יוצר אינדקס '{index_name}'...")
            meili_create_index(meili_url, index_name, primary_key="id")
            
            batch = []
            uploaded_pages = 0
            started_at = time.time()
            task_uids = []
            session = requests.Session()
            
            # Process PDFs in parallel
            with Pool(processes=num_workers) as pool:
                for pdf_i, documents in enumerate(pool.imap(process_single_pdf, pdf_paths), start=1):
                    if not self.is_running:
                        self.log("תהליך נעצר על ידי המשתמש")
                        break
                    
                    if not documents:
                        continue
                    
                    pdf_name = documents[0]["source_file"]
                    self.log(f"[{pdf_i:,}/{len(pdf_paths):,}] עובד: {pdf_name} ({len(documents)} עמודים)")
                    
                    # Update progress
                    progress = (pdf_i / len(pdf_paths)) * 100
                    self.progress_var.set(progress)
                    self.status_label.config(text=f"מעבד: {pdf_i}/{len(pdf_paths)} קבצים")
                    
                    batch.extend(documents)
                    
                    # Upload when batch is full
                    while len(batch) >= batch_size:
                        upload_batch_data = batch[:batch_size]
                        batch = batch[batch_size:]
                        
                        try:
                            task_uid = upload_batch_session(session, meili_url, index_name, upload_batch_data, 300)
                            task_uids.append(task_uid)
                            uploaded_pages += len(upload_batch_data)
                            elapsed = max(time.time() - started_at, 0.001)
                            rate = uploaded_pages / elapsed
                            self.log(f"הועלו {len(upload_batch_data)} עמודים (סה\"כ: {uploaded_pages:,}) - {rate:.1f} עמודים/שנייה")
                        except Exception as e:
                            self.log(f"שגיאה בהעלאת אצווה: {e}")
                            self.finish_indexing(False)
                            return
            
            # Upload remaining batch
            if batch and self.is_running:
                try:
                    task_uid = upload_batch_session(session, meili_url, index_name, batch, 300)
                    task_uids.append(task_uid)
                    uploaded_pages += len(batch)
                    self.log(f"הועלו {len(batch)} עמודים אחרונים (סה\"כ: {uploaded_pages:,})")
                except Exception as e:
                    self.log(f"שגיאה בהעלאת אצווה אחרונה: {e}")
                    self.finish_indexing(False)
                    return
            
            # Wait for tasks
            if wait_tasks and task_uids and self.is_running:
                last_uid = task_uids[-1]
                self.log("\nממתין לסיום עיבוד האינדקס ב-Meilisearch...")
                self.log("(זה יכול לקחת זמן תלוי בכמות הנתונים)")
                self.status_label.config(text="מעבד אינדקס ב-Meilisearch...")
                
                # Progress callback for GUI
                def progress_callback(status, elapsed, payload):
                    if not self.is_running:
                        return
                    
                    # Update status every few seconds
                    status_text = f"מעבד אינדקס: {status} ({elapsed:.0f}s)"
                    self.status_label.config(text=status_text)
                    
                    # Get processing details if available
                    if payload:
                        details = payload.get("details", {})
                        if details:
                            received = details.get("receivedDocuments", 0)
                            indexed = details.get("indexedDocuments", 0)
                            if received and indexed is not None and received > 0:
                                progress_pct = (indexed / received) * 100
                                self.log(f"התקדמות: {indexed:,}/{received:,} מסמכים ({progress_pct:.1f}%)")
                
                try:
                    ok, payload = meili_wait_for_task(meili_url, last_uid, 0.5, 600, progress_callback)
                    if not ok:
                        self.log(f"\nמשימה נכשלה: {last_uid}")
                        if payload:
                            self.log(f"פרטי משימה: {payload}")
                        self.finish_indexing(False)
                        return
                    else:
                        self.log("\nעיבוד האינדקס הושלם בהצלחה!")
                except Exception as e:
                    self.log(f"\nשגיאה בהמתנה למשימה: {e}")
                    self.finish_indexing(False)
                    return
            
            # Get stats
            stats = meili_get_index_stats(meili_url, index_name)
            if stats:
                self.log(f"סטטיסטיקות אינדקס: {stats}")
            
            elapsed_total = time.time() - started_at
            self.log(f"\nהושלם! סה\"כ עמודים שהועלו: {uploaded_pages:,}")
            self.log(f"זמן כולל: {elapsed_total:.1f} שניות ({uploaded_pages/elapsed_total:.1f} עמודים/שנייה)")
            
            self.progress_var.set(100)
            self.status_label.config(text="הושלם בהצלחה!")
            self.finish_indexing(True)
            
        except Exception as e:
            self.log(f"שגיאה כללית: {e}")
            import traceback
            self.log(traceback.format_exc())
            self.finish_indexing(False)
    
    def finish_indexing(self, success):
        self.is_running = False
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
        
        if success:
            self.status_label.config(text="הושלם בהצלחה!")
        else:
            self.status_label.config(text="נכשל")


def main():
    # Ensure multiprocessing works correctly on Windows
    freeze_support()
    
    root = tk.Tk()
    app = PDFIndexerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
